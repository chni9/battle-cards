/**
 * Compact icon control — L43-05 / technical spec v6 §6.1.
 * 44px target; not the full Button min-width.
 */

import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'children' | 'aria-label'
> {
  'aria-label': string;
  children: ReactNode;
  className?: string;
}

export function IconButton({
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: IconButtonProps): ReactElement {
  return (
    <button
      type={type}
      disabled={disabled}
      className={[
        'inline-flex h-11 w-11 shrink-0 items-center justify-center',
        'rounded-[length:var(--radius-button)] border border-border-soft bg-surface-raised',
        'font-sans text-lg font-semibold text-ink',
        'shadow-[0_1px_2px_rgba(28,26,31,0.12)]',
        'transition-[transform,background-color,box-shadow,opacity] duration-150 ease-out',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        'enabled:active:translate-y-px enabled:active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none',
        'motion-reduce:transition-none motion-reduce:enabled:active:translate-y-0 motion-reduce:enabled:active:scale-100',
        'hover:enabled:bg-surface',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
