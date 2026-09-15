/**
 * Lobby Ready / Not ready marks — L57-16.
 * Inline SVG, Outfit via the lobby `font-sans` row. Not PNG art.
 */

import type { ReactElement } from 'react';

import { lobbyReadyLabel } from './lobby-ready';

export function LobbyReadyCheckIcon({ size = 18 }: { size?: number }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className="shrink-0"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12.5 9.5 17 19 7"
      />
    </svg>
  );
}

export function LobbyReadyCrossIcon({ size = 18 }: { size?: number }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className="shrink-0"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5"
      />
    </svg>
  );
}

/** Fixed-width column so nicknames line up. */
export function LobbyReadyStatusMark({ isReady }: { isReady: boolean }): ReactElement {
  return (
    <span
      className={[
        'inline-flex w-6 shrink-0 items-center justify-center font-sans',
        isReady ? 'text-cta-green-deep' : 'text-cta-red',
      ].join(' ')}
      aria-label={lobbyReadyLabel(isReady)}
    >
      {isReady ? <LobbyReadyCheckIcon /> : <LobbyReadyCrossIcon />}
    </span>
  );
}
