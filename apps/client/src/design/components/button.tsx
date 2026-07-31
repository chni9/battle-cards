/**
 * Ornate CSS CTA — technical spec v2 §5, L10-04.
 * Inspired by colored button PNG hues; no image skins (Lot 10 ruling).
 */

import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

type ButtonVariant = 'purple' | 'yellow' | 'green' | 'red' | 'orange';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  purple:
    'from-cta-purple-hi to-cta-purple text-cta-label-on-dark border-cta-frame',
  yellow: 'from-cta-yellow to-amber-600 text-cta-label border-cta-frame',
  green: 'from-cta-green to-cta-green-deep text-cta-label border-cta-frame',
  red: 'from-red-400 to-cta-red text-cta-label-on-dark border-cta-frame',
  orange: 'from-orange-300 to-cta-orange text-cta-label border-cta-frame',
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
        'inline-flex min-h-11 min-w-[7rem] items-center justify-center px-5 py-2',
        'border-[3px] border-cta-frame-deep bg-gradient-to-b font-sans text-sm font-semibold',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_0_var(--color-cta-frame-deep)]',
        '[clip-path:polygon(8%_0%,92%_0%,100%_50%,92%_100%,8%_100%,0%_50%)]',
        'transition-transform duration-150 ease-out',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        'enabled:active:translate-y-px enabled:active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-45',
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
