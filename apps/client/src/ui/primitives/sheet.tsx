/**
 * V7 bottom sheet / centered panel with the sheet-stack contract (technical spec v7 §6.7,
 * §6.6.5, §7.7; Q49, Q59). Every open sheet registers in the sheet stack
 * (`sheet-stack-context.ts`), which decides its paint order, z-index, inertness and whether
 * Esc may close it. The old V2 rule "one Esc closes every open Dialog" does not apply here.
 *
 * - `mode="read-only"` (card, kit, seat, rules, shared dialogs) closes through `onClose` on
 *   Esc (only when it is the top sheet, and not when a child control already handled the key),
 *   on a backdrop press that starts and ends on the overlay (`closeOnBackdrop`, default true)
 *   and on a swipe-down of at least `SWIPE_DISMISS_PX` on the handle. `dismissLocked` (the
 *   Feedback send lock) ignores all three; a locked top sheet absorbs Esc.
 * - `mode="blocking"` (sub-choices) has no `onClose`: it ignores Esc, backdrop and swipe and
 *   always paints above every other sheet, which turns inert under it. Its only way out besides
 *   answering is Minimize, which collapses it to a bar above every other sheet while the caller
 *   keeps intents locked (Q59). The bar restores it.
 * - `collapsed` (L74 targeting) collapses a read-only sheet to a bar with the caller's
 *   `collapsedBar` instead of the panel and releases the focus trap (§6.6.5). That bar stays
 *   under an expanded blocking sheet (§6.7), and while it is the newest read-only sheet no sheet
 *   takes Esc: the caller's targeting handler owns it.
 * - Only the top expanded sheet is live (WAI-ARIA modal dialog): it holds the focus trap, and
 *   every sheet under it is inert. Focus follows the live sheet (`use-focus-trap.ts`): it moves
 *   into a sheet that becomes live, and on close returns to the opener only when the opener is
 *   reachable, otherwise into the new top sheet, otherwise up the opener chain.
 * - A press during a sheet's exit does nothing (spec v7 §1, §6.6.4): the exiting live sheet's
 *   overlay stays a hit-testable, `aria-hidden` shield over the whole box whose handlers check
 *   the sheet is still open, and only its panel turns inert. A covered sheet that closes stays
 *   inert and click-through, one z-index under the live sheet. A real collapse to the bar, or a
 *   restore from it, raises a no-op shield over the box, bar included, for `DUR_BASE_MS` (none
 *   under reduced motion) while Minimize and restore ignore presses; the bar shows at once.
 * - A body that overflows becomes a named, focusable scroll region in the Tab cycle (WCAG
 *   2.1.1), so a text-only sheet scrolls by keyboard; initial focus still prefers a control.
 *
 * The overlay is sized to the live `visualViewport` box, never `100dvh` or `inset-0`
 * (L53-02 / L53-07), and every bar it would sit behind adds `BAR_SLOT_PX` of bottom padding so
 * content stays above the bars. Sheets portal to `document.body`, so the `Z_INDEX` layers are
 * global and a caller's `<form>` or transformed ancestor cannot capture them. Placement is
 * `bottom` unless the caller asks for `center` or `auto` (Dialog: centered on desktop only).
 */

import { AnimatePresence, motion } from 'motion/react';
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../icons/icon';
import { DUR_BASE_MS, durationS, EASE_ENTRANCE } from '../motion/motion-tokens';
import { motionPropsFor, type V7MotionSpec } from '../motion/reduced-motion';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import { V7_COLORS } from '../palette';
import { seatColorAlpha } from '../seat-colors';
import { MINIMIZE_LABEL } from '../ui-copy';
import { useVisualViewportBox } from '../use-visual-viewport-box';
import { Button } from './button';
import { CHROME_FOCUS_INSET_CLASS, CHROME_OUTLINE_CLASS, ICON_WELL_CLASS, motionAttribute } from './chrome-classes';
import { dialogPreferredMaxWidth } from './dialog-width';
import { PresenceLayer } from './presence-layer';
import { resolveSheetPlacement, type SheetPlacement, type SheetPlacementPreference } from './sheet-placement';
import {
  escTargetId,
  isSheetInert,
  liveSheetId,
  sheetPaintOrder,
  sheetZIndex,
} from './sheet-stack';
import { useSheetStackState, useSheetStackStore } from './sheet-stack-context';
import { livePanel, reachableIn } from './sheet-focus';
import { SCROLL_REGION_ATTRIBUTE, useFocusTrap } from './use-focus-trap';

interface SheetBaseProps {
  open: boolean;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  placement?: SheetPlacementPreference;
  height?: 'auto' | 'full';
  initialFocusRef?: RefObject<HTMLElement | null>;
  hintAnchor?: string;
  dataAttributes?: Readonly<Record<`data-${string}`, string>>;
  collapsed?: boolean;
  collapsedBar?: ReactNode;
  className?: string;
}

export interface ReadOnlySheetProps extends SheetBaseProps {
  mode: 'read-only';
  onClose: () => void;
  dismissLocked?: boolean;
  /** `false` keeps Esc and swipe but ignores backdrop presses (default true). */
  closeOnBackdrop?: boolean;
}

export interface BlockingSheetProps extends SheetBaseProps {
  mode: 'blocking';
  onMinimizedChange?: (minimized: boolean) => void;
}

export type SheetProps = ReadOnlySheetProps | BlockingSheetProps;

/** A drag of at least this many pixels down the handle closes a read-only sheet. */
const SWIPE_DISMISS_PX = 80;
/** One bar slot: a 44 px bar plus an 8 px gap, stacked up from the visible bottom edge. */
const BAR_SLOT_PX = 52;
const BAR_HEIGHT_PX = 44;
/** The centered panel's gutter (`p-4`), kept when bars add bottom padding. */
const CENTER_GUTTER_PX = 16;

const OVERLAY_MOTION: V7MotionSpec = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: durationS('fast') },
};

const PANEL_TRANSITION = { duration: durationS('base'), ease: EASE_ENTRANCE };
const PANEL_MOTION: Readonly<Record<SheetPlacement, V7MotionSpec>> = {
  bottom: {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 24 },
    transition: PANEL_TRANSITION,
  },
  center: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: PANEL_TRANSITION,
  },
};

const OVERLAY_PLACEMENT_CLASS: Readonly<Record<SheetPlacement, string>> = {
  bottom: 'pt-4',
  center: 'p-4',
};

/** `mt-auto` seats a bottom sheet on the bottom edge; `my-auto` centers a short panel. */
const PANEL_PLACEMENT_CLASS: Readonly<Record<SheetPlacement, string>> = {
  bottom: 'mt-auto rounded-t-v7-chrome',
  center: 'my-auto rounded-v7-chrome',
};

/** An overflowing body is a named, focusable scroll region; otherwise it is plain. */
function syncScrollRegion(body: HTMLElement, titleId: string): void {
  const overflows = body.scrollHeight > body.clientHeight;
  if (overflows === body.hasAttribute(SCROLL_REGION_ATTRIBUTE)) return;
  if (overflows) {
    body.setAttribute(SCROLL_REGION_ATTRIBUTE, '');
    body.setAttribute('role', 'region');
    body.setAttribute('aria-labelledby', titleId);
    body.tabIndex = 0;
  } else {
    body.removeAttribute(SCROLL_REGION_ATTRIBUTE);
    body.removeAttribute('role');
    body.removeAttribute('aria-labelledby');
    body.removeAttribute('tabindex');
  }
}

export function Sheet(props: SheetProps): ReactElement | null {
  const {
    open,
    title,
    children,
    actions,
    placement = 'bottom',
    height = 'auto',
    initialFocusRef,
    hintAnchor,
    dataAttributes,
    collapsed,
    collapsedBar,
    className,
    mode,
  } = props;
  const readOnly = props.mode === 'read-only';
  const dismissLocked = props.mode === 'read-only' && props.dismissLocked === true;
  const closeOnBackdrop = props.mode === 'read-only' && props.closeOnBackdrop !== false;

  const id = useId();
  const titleId = useId();
  const store = useSheetStackStore();
  const stack = useSheetStackState();
  const box = useVisualViewportBox();
  const reduced = usePrefersReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const focusBarNext = useRef(false);
  const pressStartedOnOverlay = useRef(false);
  const swipe = useRef<{ readonly pointerId: number; readonly startY: number } | null>(null);
  /** False from the commit that closes the sheet: stale handlers on the exiting tree read it. */
  const live = useRef(false);

  // Layout effects, so the stack is current before the first paint. `dismissLocked` and
  // `collapsed` sync separately: a lock toggle must never re-open the entry or re-stamp it.
  useLayoutEffect(() => {
    if (!open) return;
    store.open({ id, mode });
    return () => {
      store.close(id);
    };
  }, [open, id, mode, store]);
  useLayoutEffect(() => {
    if (open) store.setDismissLocked(id, dismissLocked);
  }, [open, id, dismissLocked, store]);
  useLayoutEffect(() => {
    if (open && collapsed !== undefined) store.setMinimized(id, collapsed);
  }, [open, id, collapsed, store]);

  const entry = open ? stack.entries.find((candidate) => candidate.id === id) : undefined;
  const paintOrder = sheetPaintOrder(stack);
  const barMode = entry?.minimized === true;
  const painted = entry !== undefined && !barMode && paintOrder.some((candidate) => candidate.id === id);
  const inert = entry !== undefined && isSheetInert(stack, id);
  const zIndex = sheetZIndex(stack, id);
  const bars = paintOrder.filter((candidate) => candidate.minimized);
  const barIndex = bars.findIndex((candidate) => candidate.id === id);
  const resolvedPlacement = resolveSheetPlacement(placement, box);
  const dismissable = readOnly && !dismissLocked && !inert && painted;

  useLayoutEffect(() => {
    live.current = entry !== undefined;
  });

  useFocusTrap(panelRef, {
    open,
    active: open && liveSheetId(stack) === id,
    isReachable: (element) => reachableIn(store.getSnapshot(), element),
    fallbackContainer: () => livePanel(store.getSnapshot(), id),
    standIn: () => barRef.current?.querySelector<HTMLElement>('button') ?? null,
    // Minimize or collapse puts the user back where they were in the sheet that takes over.
    handOverOnRelease: barMode,
    ...(initialFocusRef !== undefined ? { initialFocusRef } : {}),
  });

  // Transition shield (fix rounds 2-3): when the panel really collapses to its bar (Minimize,
  // L74 "Use" -> targeting) or a bar restores its panel, a no-op layer covers the box, bar
  // included, for the panel's animation time, and Minimize and restore ignore presses. So a fast
  // second tap never lands on the table, on the bar or on the fresh panel's Minimize (§1,
  // §6.6.4). A sheet that mounts collapsed has no panel to move, so it raises none. Derived from
  // the previous render, so it starts in the same commit. Each real transition bumps the count,
  // so a second one inside the window (a programmatic `collapsed` toggle) restarts the full
  // `DUR_BASE_MS` timer instead of inheriting what is left of the first.
  const view = barMode ? 'bar' : painted ? 'panel' : 'none';
  const [previousView, setPreviousView] = useState(view);
  const [transitionShield, setTransitionShield] = useState(false);
  const [transitionCount, setTransitionCount] = useState(0);
  if (previousView !== view) {
    setPreviousView(view);
    const transition =
      (previousView === 'panel' && view === 'bar') || (previousView === 'bar' && view === 'panel');
    const shielded = transition && !reduced;
    setTransitionShield(shielded);
    if (shielded) setTransitionCount(transitionCount + 1);
  }
  useEffect(() => {
    if (!transitionShield) return;
    const timer = window.setTimeout(() => {
      setTransitionShield(false);
    }, DUR_BASE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [transitionShield, transitionCount]);

  // Minimize hands focus to the bar, unless another sheet is now the live one (it takes focus).
  useEffect(() => {
    if (!barMode || !focusBarNext.current) return;
    focusBarNext.current = false;
    if (liveSheetId(store.getSnapshot()) !== null) return;
    barRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, [barMode, store]);

  // The body is a keyboard scroll region only while it overflows (A2); content and box changes
  // re-measure it.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!painted || body === null) return;
    syncScrollRegion(body, titleId);
    const observer = new ResizeObserver(() => {
      syncScrollRegion(body, titleId);
    });
    observer.observe(body);
    if (contentRef.current !== null) observer.observe(contentRef.current);
    return () => {
      observer.disconnect();
    };
  }, [painted, titleId]);

  const requestClose = (): void => {
    if (!live.current || props.mode !== 'read-only') return;
    props.onClose();
  };

  // Q49: only the top sheet reacts, and only to an Esc nothing handled first. Bubble phase, so
  // an open Tooltip (capture phase) closes before the sheet under it.
  const onDocumentKeyDown = useEffectEvent((event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
    if (escTargetId(store.getSnapshot()) !== id) return;
    event.preventDefault();
    requestClose();
  });
  useEffect(() => {
    if (!open || mode !== 'read-only') return;
    const listener = (event: KeyboardEvent): void => {
      onDocumentKeyDown(event);
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
    };
  }, [open, mode]);

  const onOverlayPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    pressStartedOnOverlay.current = event.target === event.currentTarget;
  };
  // A press that ends inside the panel still clicks the overlay (their common ancestor).
  const onOverlayPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.target !== event.currentTarget) pressStartedOnOverlay.current = false;
  };
  // A press on the bare backdrop would move focus to `body`, behind the modal sheet, whether or
  // not it closes the sheet; cancelling the mousedown keeps focus where it was (the click still fires).
  const onOverlayMouseDown = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) event.preventDefault();
  };
  const onOverlayClick = (event: MouseEvent<HTMLDivElement>): void => {
    const startedOnOverlay = pressStartedOnOverlay.current;
    pressStartedOnOverlay.current = false;
    if (event.target !== event.currentTarget || !startedOnOverlay) return;
    if (dismissable && closeOnBackdrop) requestClose();
  };

  const onHandlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (!dismissable || !live.current) return;
    swipe.current = { pointerId: event.pointerId, startY: event.clientY };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Not an active pointer (a synthetic event); the release still lands on the handle.
    }
  };
  const onHandlePointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    const start = swipe.current;
    if (start?.pointerId !== event.pointerId) return;
    swipe.current = null;
    if (dismissable && event.clientY - start.startY >= SWIPE_DISMISS_PX) requestClose();
  };
  const onHandlePointerCancel = (): void => {
    swipe.current = null;
  };

  const minimize = (): void => {
    if (!live.current || transitionShield) return;
    focusBarNext.current = true;
    store.setMinimized(id, true);
    if (props.mode === 'blocking') props.onMinimizedChange?.(true);
  };
  const restoreFromBar = (): void => {
    if (!live.current || transitionShield) return;
    store.setMinimized(id, false);
    if (props.mode === 'blocking') props.onMinimizedChange?.(false);
  };

  const overlayMotion = motionPropsFor(OVERLAY_MOTION, reduced);
  const panelMotion = motionPropsFor(PANEL_MOTION[resolvedPlacement], reduced);
  const centered = resolvedPlacement === 'center';
  const showHandle = readOnly && resolvedPlacement === 'bottom';
  const bottomPadding =
    bars.length > 0 ? { paddingBottom: (centered ? CENTER_GUTTER_PX : 0) + bars.length * BAR_SLOT_PX } : {};

  const renderLayer = (present: boolean): ReactElement => (
    <motion.div
      data-zone="sheet-overlay"
      data-sheet-id={id}
      role="presentation"
      hidden={!painted}
      // An exiting overlay keeps its last props. The live sheet stays hit-testable as a no-op
      // press shield (its handlers check `live`) while only its panel turns inert (§1, §6.6.4);
      // a covered sheet stays inert and click-through, under the live one (fix round 3).
      inert={inert}
      {...(present ? {} : { 'aria-hidden': true })}
      className={`flex items-start justify-center overflow-hidden ${OVERLAY_PLACEMENT_CLASS[resolvedPlacement]}`}
      style={{
        position: 'fixed',
        top: box.offsetTop,
        left: box.offsetLeft,
        width: box.width,
        height: box.height,
        zIndex: present || !inert ? zIndex : zIndex - 1,
        backgroundColor: seatColorAlpha(V7_COLORS['bg-0'], 0.6),
        ...bottomPadding,
        ...(present || !inert ? {} : { pointerEvents: 'none' as const }),
      }}
      onPointerDown={onOverlayPointerDown}
      onPointerUp={onOverlayPointerUp}
      onMouseDown={onOverlayMouseDown}
      onClick={onOverlayClick}
      {...overlayMotion}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        inert={!present}
        aria-modal={!barMode}
        aria-labelledby={titleId}
        tabIndex={-1}
        data-zone="sheet-panel"
        data-sheet-mode={mode}
        data-sheet-placement={resolvedPlacement}
        data-motion={motionAttribute(reduced)}
        {...(hintAnchor !== undefined ? { 'data-hint-anchor': hintAnchor } : {})}
        {...dataAttributes}
        className={[
          'flex min-h-0 w-full min-w-0 flex-col bg-v7-panel font-v7-body text-v7-text shadow-v7-chrome outline-none',
          CHROME_OUTLINE_CLASS,
          PANEL_PLACEMENT_CLASS[resolvedPlacement],
          height === 'full' ? 'h-full' : '',
          className ?? '',
        ].join(' ')}
        style={{ maxHeight: '100%', maxWidth: `min(${dialogPreferredMaxWidth(className ?? '')}, 100%)` }}
        {...panelMotion}
      >
        {showHandle ? (
          <div
            data-zone="sheet-handle"
            aria-hidden="true"
            className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center"
            onPointerDown={onHandlePointerDown}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerCancel}
          >
            <span className="h-1.5 w-10 rounded-full bg-v7-text-2 opacity-60" />
          </div>
        ) : null}
        <h2
          id={titleId}
          className={`shrink-0 px-4 font-v7-display text-v7-title leading-tight text-v7-text ${showHandle ? 'pt-1' : 'pt-4'}`}
        >
          {title}
        </h2>
        <div
          ref={bodyRef}
          data-zone="sheet-body"
          className={`relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-3 text-v7-body ${CHROME_FOCUS_INSET_CLASS}`}
        >
          <div ref={contentRef}>{children}</div>
        </div>
        {actions !== undefined ? (
          <div data-zone="sheet-actions" className="flex shrink-0 flex-wrap items-center justify-end gap-2 px-4 pb-4">
            {actions}
          </div>
        ) : null}
        {mode === 'blocking' ? (
          <div data-zone="sheet-minimize" className="flex shrink-0 justify-center px-4 pb-4">
            <Button variant="quiet" icon="minimize" onClick={minimize}>
              {MINIMIZE_LABEL}
            </Button>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );

  return createPortal(
    <>
      <AnimatePresence>{open ? <PresenceLayer key="sheet-overlay" render={renderLayer} /> : null}</AnimatePresence>
      {barMode ? (
        <div
          ref={barRef}
          data-zone="sheet-bar"
          data-sheet-id={id}
          inert={inert}
          className="flex justify-center px-2"
          style={{
            position: 'fixed',
            top: box.offsetTop + box.height - (barIndex + 1) * BAR_SLOT_PX,
            left: box.offsetLeft,
            width: box.width,
            height: BAR_HEIGHT_PX,
            zIndex,
            // The full-width strip lets presses through; only the bar itself takes them.
            pointerEvents: 'none',
          }}
        >
          <div className="flex w-full max-w-md items-stretch" style={{ pointerEvents: 'auto' }}>
            {collapsed === true ? (
              collapsedBar
            ) : (
              <Button variant="secondary" fullWidth aria-expanded={false} onClick={restoreFromBar}>
                <span className="inline-flex items-center gap-2">
                  <span data-icon-well className={`${ICON_WELL_CLASS} size-7`}>
                    <Icon name="chevron-right" size={18} className="-rotate-90" />
                  </span>
                  {title}
                </span>
              </Button>
            )}
          </div>
        </div>
      ) : null}
      {/* After the bar in the DOM, so on the same layer it covers the bar too. */}
      {transitionShield ? (
        <div
          data-zone="sheet-shield"
          aria-hidden="true"
          // A press on the shield does nothing, and its mousedown must not move focus either.
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          style={{
            position: 'fixed',
            top: box.offsetTop,
            left: box.offsetLeft,
            width: box.width,
            height: box.height,
            zIndex,
          }}
        />
      ) : null}
    </>,
    document.body,
  );
}
