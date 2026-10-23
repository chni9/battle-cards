/**
 * V7 toast (technical spec v7 §6.12): the server-reject notice and other short confirmations.
 * Any dismissal, manual or timed, goes through `onDismiss`; a state update never dismisses.
 *
 * - One dismissal per open: a guard lets the close button and the timer fire `onDismiss` once
 *   between them, with `'manual'` or `'timeout'`, until `open` turns true again.
 * - The timer starts when `open` turns true, with the `timeoutMs` of that moment, and survives
 *   rerenders: a new title, body, tone, `timeoutMs` or `onDismiss` never restarts or fires it.
 *   It calls the latest `onDismiss`. Without `timeoutMs` the toast stays until closed by hand.
 * - Errors go to a `role="alert"` region, everything else to a `role="status"` one. Both
 *   regions stay mounted while the Toast is, empty when closed, and only their content swaps,
 *   so screen readers announce a polite toast too. They portal to `document.body` on the
 *   `Z_INDEX.toast` layer, above sheets and banners, sized to the visual viewport; only the card
 *   takes pointer events, so the table stays usable around it.
 * - A closing toast keeps its fade, but its OK button no longer dismisses: the exiting card is
 *   inert and click-through, and a manual dismissal needs `open` to still be true.
 * - It slides down 12 px while fading in; under reduced motion it only fades (§8.3).
 */

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { Z_INDEX } from '../layers';
import { durationS, EASE_ENTRANCE } from '../motion/motion-tokens';
import { motionPropsFor, type V7MotionSpec } from '../motion/reduced-motion';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import { useVisualViewportBox } from '../use-visual-viewport-box';
import { CHROME_SHAPE_SM_CLASS, motionAttribute } from './chrome-classes';
import { IconButton } from './icon-button';
import { PresenceLayer } from './presence-layer';
import { livePanel } from './sheet-focus';
import { useSheetStackStore } from './sheet-stack-context';
import { focusIntoTrap } from './use-focus-trap';

export type ToastTone = 'info' | 'success' | 'error';
export type ToastDismissCause = 'manual' | 'timeout';

export interface ToastProps {
  open: boolean;
  title: string;
  body?: string;
  tone?: ToastTone;
  timeoutMs?: number;
  dismissLabel: string;
  onDismiss: (cause: ToastDismissCause) => void;
}

/** The toast's distance from the top of the visible box. */
const TOP_GAP_PX = 8;

const TOAST_MOTION: V7MotionSpec = {
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: durationS('base'), ease: EASE_ENTRANCE },
};

/** A tone accent on the leading edge; resource and threat hues stay off the text (§5.1). */
const TONE_ACCENT_CLASS: Readonly<Record<ToastTone, string>> = {
  info: 'border-l-v7-cta-2',
  success: 'border-l-v7-upgrade',
  error: 'border-l-v7-danger',
};

export function Toast({
  open,
  title,
  body,
  tone = 'info',
  timeoutMs,
  dismissLabel,
  onDismiss,
}: ToastProps): ReactElement | null {
  const reduced = usePrefersReducedMotion();
  const box = useVisualViewportBox();
  const dismissed = useRef(false);
  const timer = useRef<number | null>(null);

  const readTimeoutMs = useEffectEvent((): number | undefined => timeoutMs);
  const dismissOnTimeout = useEffectEvent((): void => {
    timer.current = null;
    if (dismissed.current) return;
    dismissed.current = true;
    onDismiss('timeout');
  });

  useEffect(() => {
    if (!open) return;
    dismissed.current = false;
    const delay = readTimeoutMs();
    if (delay === undefined) return;
    const id = window.setTimeout(() => {
      dismissOnTimeout();
    }, delay);
    timer.current = id;
    return () => {
      window.clearTimeout(id);
      timer.current = null;
    };
  }, [open]);

  const store = useSheetStackStore();
  const live = useRef(open);
  useLayoutEffect(() => {
    live.current = open;
  });

  /** The element focused before focus entered the toast (its OK button). */
  const focusedBefore = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  /**
   * The OK button goes inert as the toast closes, and browsers then drop focus to `body`,
   * behind any modal sheet. Put it back: into the live sheet (onto the element focused before,
   * when that is inside it), else onto that element, else leave it (fix round 2).
   */
  const returnFocusFromToast = (): void => {
    const card = cardRef.current;
    if (!card?.contains(document.activeElement)) return;
    const before = focusedBefore.current?.isConnected === true ? focusedBefore.current : null;
    const panel = livePanel(store.getSnapshot());
    if (panel !== null) {
      if (before !== null && panel.contains(before)) before.focus();
      else focusIntoTrap(panel);
    } else {
      before?.focus();
    }
  };

  const dismissByHand = (): void => {
    if (!live.current || dismissed.current) return;
    dismissed.current = true;
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    returnFocusFromToast();
    onDismiss('manual');
  };

  const regionStyle = {
    position: 'fixed',
    top: box.offsetTop + TOP_GAP_PX,
    left: box.offsetLeft,
    width: box.width,
    zIndex: Z_INDEX.toast,
    pointerEvents: 'none',
  } as const;

  const renderCard = (present: boolean): ReactElement => (
    <motion.div
      ref={cardRef}
      data-zone="toast"
      data-toast-tone={tone}
      onFocus={(event) => {
        const from = event.relatedTarget;
        if (from instanceof HTMLElement && !event.currentTarget.contains(from)) focusedBefore.current = from;
      }}
      data-motion={motionAttribute(reduced)}
      // An exiting toast keeps its last props; `present` makes its OK inert and click-through.
      inert={!present}
      className={`flex w-full max-w-sm items-start gap-3 bg-v7-panel-2 py-2 pr-2 pl-3 ${CHROME_SHAPE_SM_CLASS} ${TONE_ACCENT_CLASS[tone]}`}
      // Inline like the region's `none`, so the two always resolve against each other.
      style={{ pointerEvents: present ? 'auto' : 'none' }}
      {...motionPropsFor(TOAST_MOTION, reduced)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
        <p className="font-v7-display text-v7-body leading-tight text-v7-text">{title}</p>
        {body !== undefined ? <p className="font-v7-body text-v7-caption font-bold text-v7-text-2">{body}</p> : null}
      </div>
      <IconButton aria-label={dismissLabel} icon="close" variant="quiet" onClick={dismissByHand} />
    </motion.div>
  );

  // Both live regions stay mounted while the Toast is, empty when closed: a polite region that
  // mounts together with its content is skipped by many screen readers. Errors go to the alert.
  const region = (role: 'status' | 'alert', shows: boolean): ReactElement => (
    <div role={role} data-zone="toast-region" data-motion={motionAttribute(reduced)} className="flex justify-center px-2" style={regionStyle}>
      <AnimatePresence>{shows ? <PresenceLayer key="toast" render={renderCard} /> : null}</AnimatePresence>
    </div>
  );

  return createPortal(
    <>
      {region('status', open && tone !== 'error')}
      {region('alert', open && tone === 'error')}
    </>,
    document.body,
  );
}
