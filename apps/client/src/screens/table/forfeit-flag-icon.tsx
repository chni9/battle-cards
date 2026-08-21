/**
 * Inline forfeit / leave-table flag — L43-05. Not a PNG (do not invent art).
 */

import type { ReactElement } from 'react';

export function ForfeitFlagIcon({ size = 20 }: { size?: number }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className="text-cta-red"
    >
      <path
        fill="currentColor"
        d="M6 2.75a.75.75 0 0 1 .75.75v16.75h1.5V13.5h9.1a.75.75 0 0 0 .64-1.14L16.2 8.5l1.79-3.86A.75.75 0 0 0 17.35 3.5H8.25V3.5A.75.75 0 0 1 7.5 2.75H6z"
      />
    </svg>
  );
}
