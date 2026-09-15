/**
 * Inline Spy / Unspy eye — L58-07. Not a PNG (do not invent art).
 */

import type { ReactElement } from 'react';

export type SpyEyeIconVariant = 'open' | 'crossed';

export interface SpyEyeIconProps {
  variant?: SpyEyeIconVariant;
  size?: number;
  className?: string;
}

export function SpyEyeIcon({
  variant = 'open',
  size = 16,
  className = '',
}: SpyEyeIconProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className={className}
    >
      <path
        fill="currentColor"
        d="M12 5C7 5 2.7 8.1 1 12c1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 11.5A4.5 4.5 0 1 1 12 8a4.5 4.5 0 0 1 0 8.5zM12 10.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z"
      />
      {variant === 'crossed' ? (
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.2"
          d="M5 5 L19 19"
        />
      ) : null}
    </svg>
  );
}
