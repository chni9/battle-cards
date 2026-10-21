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
 *   always paints above read-only sheets, which turn inert under it. Its only way out besides
 *   answering is Minimize, which collapses it to a bar above every other sheet while the caller
 *   keeps intents locked (Q59). The bar restores it.
 * - `collapsed` (L74 targeting) collapses any sheet to the bar layer with the caller's
 *   `collapsedBar` instead of the panel, and releases the focus trap (§6.6.5).
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
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { durationS, EASE_ENTRANCE } from '../motion/motion-tokens';
import { motionPropsFor, type V7MotionSpec } from '../motion/reduced-motion';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import { V7_COLORS } from '../palette';
import { seatColorAlpha } from '../seat-colors';
import { MINIMIZE_LABEL } from '../ui-copy';
import { useVisualViewportBox } from '../use-visual-viewport-box';
import { Button } from './button';
import { CHROME_OUTLINE_CLASS, motionAttribute } from './chrome-classes';
import { dialogPreferredMaxWidth } from './dialog-width';
import { resolveSheetPlacement, type SheetPlacement, type SheetPlacementPreference } from './sheet-placement';
import { escTargetId, isSheetInert, sheetPaintOrder, sheetZIndex } from './sheet-stack';
import { useSheetStackState, useSheetStackStore } from './sheet-stack-context';
import { useFocusTrap } from './use-focus-trap';

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
  const barRef = useRef<HTMLDivElement>(null);
  const focusBarNext = useRef(false);
  const pressStartedOnOverlay = useRef(false);
  const swipe = useRef<{ readonly pointerId: number; readonly startY: number } | null>(null);

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

  useFocusTrap(panelRef, {
    active: entry !== undefined && !barMode,
    // Collapsing to the bar hands focus to the bar (Minimize) or to the caller (targeting).
    restoreFocus: !barMode,
    ...(initialFocusRef !== undefined ? { initialFocusRef } : {}),
  });

  useEffect(() => {
    if (!barMode || !focusBarNext.current) return;
    focusBarNext.current = false;
    barRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, [barMode]);

  const requestClose = (): void => {
    if (props.mode === 'read-only') props.onClose();
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
    if (!dismissable) return;
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
    focusBarNext.current = true;
    store.setMinimized(id, true);
    if (props.mode === 'blocking') props.onMinimizedChange?.(true);
  };
  const restoreFromBar = (): void => {
    store.setMinimized(id, false);
    if (props.mode === 'blocking') props.onMinimizedChange?.(false);
  };

  const overlayMotion = motionPropsFor(OVERLAY_MOTION, reduced);
  const panelMotion = motionPropsFor(PANEL_MOTION[resolvedPlacement], reduced);
  const centered = resolvedPlacement === 'center';
  const showHandle = readOnly && resolvedPlacement === 'bottom';
  const bottomPadding =
    bars.length > 0 ? { paddingBottom: (centered ? CENTER_GUTTER_PX : 0) + bars.length * BAR_SLOT_PX } : {};

  return createPortal(
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="sheet-overlay"
            data-zone="sheet-overlay"
            role="presentation"
            hidden={!painted}
            inert={inert}
            className={`flex items-start justify-center overflow-hidden ${OVERLAY_PLACEMENT_CLASS[resolvedPlacement]}`}
            style={{
              position: 'fixed',
              top: box.offsetTop,
              left: box.offsetLeft,
              width: box.width,
              height: box.height,
              zIndex,
              backgroundColor: seatColorAlpha(V7_COLORS['bg-0'], 0.6),
              ...bottomPadding,
            }}
            onPointerDown={onOverlayPointerDown}
            onMouseDown={onOverlayMouseDown}
            onClick={onOverlayClick}
            {...overlayMotion}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
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
                data-zone="sheet-body"
                className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-3 text-v7-body"
              >
                {children}
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
        ) : null}
      </AnimatePresence>
      {barMode ? (
        <div
          ref={barRef}
          data-zone="sheet-bar"
          className="flex justify-center px-2"
          style={{
            position: 'fixed',
            top: box.offsetTop + box.height - (barIndex + 1) * BAR_SLOT_PX,
            left: box.offsetLeft,
            width: box.width,
            height: BAR_HEIGHT_PX,
            zIndex,
          }}
        >
          <div className="flex w-full max-w-md items-stretch">
            {collapsed === true ? (
              collapsedBar
            ) : (
              <Button variant="secondary" fullWidth onClick={restoreFromBar}>
                {title}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
