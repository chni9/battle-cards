/**
 * V7 toast (technical spec v7 §6.12): the server-reject notice and other short confirmations.
 * Any dismissal, manual or timed, goes through `onDismiss`; a state update never dismisses.
 *
 * - One dismissal per open: a guard lets the close button and the timer fire `onDismiss` once
 *   between them, with `'manual'` or `'timeout'`, until `open` turns true again.
 * - The timer starts when `open` turns true, with the `timeoutMs` of that moment, and survives
 *   rerenders: a new title, body, tone, `timeoutMs` or `onDismiss` never restarts or fires it.
 *   It calls the latest `onDismiss`. Without `timeoutMs` the toast stays until closed by hand.
 * - Errors are `role="alert"`, everything else `role="status"`. The toast portals to
 *   `document.body` on the `Z_INDEX.toast` layer, above sheets and banners, sized to the
 *   visual viewport; only its card takes pointer events, so the table stays usable around it.
 * - It slides down 12 px while fading in; under reduced motion it only fades (§8.3).
 */

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useEffectEvent, useRef, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { Z_INDEX } from '../layers';
import { durationS, EASE_ENTRANCE } from '../motion/motion-tokens';
import { motionPropsFor, type V7MotionSpec } from '../motion/reduced-motion';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import { useVisualViewportBox } from '../use-visual-viewport-box';
import { CHROME_SHAPE_SM_CLASS, motionAttribute } from './chrome-classes';
import { IconButton } from './icon-button';

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

  const dismissByHand = (): void => {
    if (dismissed.current) return;
    dismissed.current = true;
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    onDismiss('manual');
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="toast"
          role={tone === 'error' ? 'alert' : 'status'}
          data-zone="toast"
          data-toast-tone={tone}
          data-motion={motionAttribute(reduced)}
          className="flex justify-center px-2"
          style={{
            position: 'fixed',
            top: box.offsetTop + TOP_GAP_PX,
            left: box.offsetLeft,
            width: box.width,
            zIndex: Z_INDEX.toast,
            pointerEvents: 'none',
          }}
          {...motionPropsFor(TOAST_MOTION, reduced)}
        >
          <div
            className={`flex w-full max-w-sm items-start gap-3 bg-v7-panel-2 py-2 pr-2 pl-3 ${CHROME_SHAPE_SM_CLASS} ${TONE_ACCENT_CLASS[tone]}`}
            // Inline like the root's `none`, so the two always resolve against each other.
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
              <p className="font-v7-display text-v7-body leading-tight text-v7-text">{title}</p>
              {body !== undefined ? (
                <p className="font-v7-body text-v7-caption font-bold text-v7-text-2">{body}</p>
              ) : null}
            </div>
            <IconButton aria-label={dismissLabel} icon="close" variant="quiet" onClick={dismissByHand} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
