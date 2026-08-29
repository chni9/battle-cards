/**
 * Accessible Dialog / ActionSheet — technical spec v2 §5, L11-03.
 * Focus trap, Esc, overlay dismiss, aria-modal. Motion enter on open.
 */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

import { MOTION_DURATION_S, MOTION_EASE } from '../../fx/motion-timing';

export interface DialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  /** Primary / secondary actions (typically Button components). */
  actions?: ReactNode;
  onClose: () => void;
  /** When false, overlay click does not close (default true). */
  closeOnOverlayClick?: boolean;
  /** Extra classes on the dialog panel (e.g. wider kit inspect). */
  panelClassName?: string;
  /** First-game hint anchor on the panel (elimination reward). */
  hintAnchor?: string;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  title,
  children,
  actions,
  onClose,
  closeOnOverlayClick = true,
  panelClassName = '',
  hintAnchor,
}: DialogProps): ReactElement {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const panel = panelRef.current;
    if (panel !== null) {
      const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = focusables[0];
      if (first !== undefined) {
        first.focus();
      } else {
        panel.focus();
      }
    }

    return () => {
      previouslyFocused.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Tab') {
      return;
    }

    const panel = panelRef.current;
    if (panel === null) {
      return;
    }

    const focusables = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
    );
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (first === undefined || last === undefined) {
      return;
    }

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onOverlayClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (!closeOnOverlayClick) {
      return;
    }
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="dialog-overlay"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/45 p-4 sm:items-center"
          role="presentation"
          onClick={onOverlayClick}
          initial={reduceMotion === true ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion === true ? 0 : MOTION_DURATION_S * 0.7 }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onKeyDown={onPanelKeyDown}
            className={[
              'flex max-h-[min(90dvh,40rem)] w-full max-w-md flex-col overflow-hidden',
              'rounded-[length:var(--radius-card)] border border-border',
              'bg-surface-raised p-5 font-sans text-ink shadow-[0_12px_40px_rgba(28,26,31,0.28)]',
              'outline-none',
              panelClassName,
            ].join(' ')}
            {...(hintAnchor !== undefined
              ? { 'data-hint-anchor': hintAnchor }
              : {})}
            initial={
              reduceMotion === true
                ? false
                : { opacity: 0, y: 28, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{
              duration: reduceMotion === true ? 0 : MOTION_DURATION_S,
              ease: MOTION_EASE,
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <h2 id={titleId} className="shrink-0 text-lg font-semibold tracking-tight text-ink">
              {title}
            </h2>
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto text-sm text-ink-muted">
              {children}
            </div>
            {actions !== undefined && (
              <div className="mt-5 flex shrink-0 flex-wrap items-center justify-end gap-3">
                {actions}
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
