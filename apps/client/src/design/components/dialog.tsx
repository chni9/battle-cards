/**
 * Accessible Dialog / ActionSheet — technical spec v2 §5, L11-03.
 * Focus trap, Esc, overlay dismiss, aria-modal. No new dependency.
 */

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

export interface DialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  /** Primary / secondary actions (typically Button components). */
  actions?: ReactNode;
  onClose: () => void;
  /** When false, overlay click does not close (default true). */
  closeOnOverlayClick?: boolean;
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
}: DialogProps): ReactElement | null {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

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

  if (!open) {
    return null;
  }

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
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/45 p-4 sm:items-center motion-reduce:transition-none"
      role="presentation"
      onClick={onOverlayClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onPanelKeyDown}
        className={[
          'w-full max-w-md rounded-[length:var(--radius-card)] border border-border',
          'bg-surface-raised p-5 font-sans text-ink shadow-[0_12px_40px_rgba(28,26,31,0.28)]',
          'outline-none',
        ].join(' ')}
      >
        <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
          {title}
        </h2>
        <div className="mt-3 text-sm text-ink-muted">{children}</div>
        {actions !== undefined && (
          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">{actions}</div>
        )}
      </div>
    </div>
  );
}
