/**
 * Connection / elimination status badge — frontend.md degraded states, L10-04.
 * Same thresholds as the former formatConnectionBadge string helper.
 */

import type { ReactElement } from 'react';

export interface ConnectionBadgePlayer {
  connection: {
    status: 'connected' | 'disconnected' | 'absent';
    automaticTurnsTaken: number;
    consecutiveTimeouts: number;
  };
  isEliminated: boolean;
}

export interface ConnectionBadgeProps {
  player: ConnectionBadgePlayer;
  className?: string;
}

function badgeLabel(player: ConnectionBadgePlayer): string | null {
  if (player.isEliminated) {
    return 'eliminated';
  }

  const { status, automaticTurnsTaken, consecutiveTimeouts } = player.connection;

  if (status === 'disconnected') {
    return 'disconnected — grace';
  }

  if (status === 'absent') {
    return `absent ${automaticTurnsTaken}/3`;
  }

  if (consecutiveTimeouts > 0) {
    return `idle timeouts ${consecutiveTimeouts}/5`;
  }

  return null;
}

export function ConnectionBadge({
  player,
  className = '',
}: ConnectionBadgeProps): ReactElement | null {
  const label = badgeLabel(player);
  if (label === null) {
    return null;
  }

  const tone = player.isEliminated
    ? 'bg-ink/80 text-cta-label-on-dark'
    : 'bg-slate text-slate-soft';

  return (
    <span
      className={[
        'ml-1 inline-block rounded-[length:var(--radius-badge)] px-1.5 py-0.5',
        'align-middle font-sans text-[10px] font-semibold uppercase tracking-wide',
        tone,
        className,
      ].join(' ')}
    >
      {label}
    </span>
  );
}
