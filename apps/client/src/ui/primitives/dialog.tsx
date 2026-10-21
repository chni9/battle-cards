/**
 * V7 shared dialog (technical spec v7 §7.7): a read-only `Sheet` with placement `auto`, so it
 * is a bottom sheet on phones and a centered dialog on desktop, and follows the §6.7 stack
 * contract (Esc closes only the top sheet, Q49). Claim seat, Feedback and the leave confirm
 * build on it; `dismissLocked` is the Feedback send lock, which ignores Esc, backdrop and swipe.
 *
 * Width is a static `max-w-*` class read through `dialogPreferredMaxWidth`, capped inline to
 * `min(<rem>, 100%)` so a 390 px phone never clips the footer (L53-02 / L53-07). It does not use
 * `dialogPanelClassName`, whose V2 base classes would bring V2 chrome into a V7 panel.
 */

import type { ReactElement, ReactNode, RefObject } from 'react';
import { Sheet } from './sheet';

export interface DialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  dismissLocked?: boolean;
  width?: 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  hintAnchor?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  dataAttributes?: Readonly<Record<`data-${string}`, string>>;
}

/** 28 / 32 / 36 / 42 / 48 rem through `dialogPreferredMaxWidth`. */
const DIALOG_WIDTH_CLASS = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
} as const;

export function Dialog({
  open,
  title,
  children,
  actions,
  onClose,
  closeOnBackdrop,
  dismissLocked,
  width = 'md',
  hintAnchor,
  initialFocusRef,
  dataAttributes,
}: DialogProps): ReactElement | null {
  return (
    <Sheet
      open={open}
      mode="read-only"
      placement="auto"
      title={title}
      onClose={onClose}
      className={DIALOG_WIDTH_CLASS[width]}
      {...(actions !== undefined ? { actions } : {})}
      {...(closeOnBackdrop !== undefined ? { closeOnBackdrop } : {})}
      {...(dismissLocked !== undefined ? { dismissLocked } : {})}
      {...(hintAnchor !== undefined ? { hintAnchor } : {})}
      {...(initialFocusRef !== undefined ? { initialFocusRef } : {})}
      {...(dataAttributes !== undefined ? { dataAttributes } : {})}
    >
      {children}
    </Sheet>
  );
}
