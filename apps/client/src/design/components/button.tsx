/**
 * Shared CTA button — technical spec v2 §5, L10-04.
 * Solid modern fills from colored button PNG hues; no image skins (Lot 10 ruling).
 * Shape: rounded rect (Lot 11 visual refresh — hex clip-path retired).
 */

import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

type ButtonVariant = 'purple' | 'yellow' | 'green' | 'red' | 'orange';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  purple:
    'bg-cta-purple text-cta-label-on-dark hover:enabled:bg-[color-mix(in_srgb,var(--color-cta-purple)_88%,white)]',
  yellow:
    'bg-cta-yellow text-cta-label hover:enabled:bg-[color-mix(in_srgb,var(--color-cta-yellow)_88%,white)]',
  green:
    'bg-cta-green-deep text-cta-label-on-dark hover:enabled:bg-[color-mix(in_srgb,var(--color-cta-green-deep)_82%,var(--color-cta-green))]',
  red: 'bg-cta-red text-cta-label-on-dark hover:enabled:bg-[color-mix(in_srgb,var(--color-cta-red)_88%,white)]',
  orange:
    'bg-cta-orange text-cta-label-on-dark hover:enabled:bg-[color-mix(in_srgb,var(--color-cta-orange)_88%,white)]',
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = 'green',
  children,
  disabled,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps): ReactElement {
  const color = VARIANT_CLASSES[variant];

  return (
    <button
      type={type}
      disabled={disabled}
      className={[
        'inline-flex min-h-11 min-w-[7rem] items-center justify-center gap-2 px-5 py-2.5',
        'rounded-[length:var(--radius-button)] border border-transparent',
        'font-sans text-sm font-semibold tracking-tight',
        'shadow-[0_1px_2px_rgba(28,26,31,0.12),0_4px_12px_rgba(28,26,31,0.08)]',
        'transition-[transform,background-color,box-shadow,opacity] duration-150 ease-out',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        'enabled:active:translate-y-px enabled:active:scale-[0.98]',
        'enabled:active:shadow-[0_1px_2px_rgba(28,26,31,0.16)]',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none',
        'motion-reduce:transition-none motion-reduce:enabled:active:translate-y-0 motion-reduce:enabled:active:scale-100',
        color,
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
