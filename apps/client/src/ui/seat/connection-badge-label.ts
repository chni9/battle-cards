/**
 * The text of a seat's connection badge — L10-04 (frontend.md degraded states) and parity
 * `global-connection-badge` (technical spec v7 Appendix A), moved unchanged from V2's private
 * `badgeLabel` in `design/components/connection-badge.tsx` so the V7 badge and the V2 one say
 * the same thing. It lives in a `.ts` because react-refresh forbids a non-component export in
 * a `.tsx`.
 *
 * The thresholds mirror the server's `ABSENT_AUTO_TURN_LIMIT` (3) and
 * `CONNECTED_TIMEOUT_LIMIT` (5) in `apps/server/src/engine/lifecycle/constants.ts`. Those
 * constants are server-only, so they are cited here, never imported.
 */

export interface ConnectionBadgePlayer {
  connection: {
    status: 'connected' | 'disconnected' | 'absent';
    automaticTurnsTaken: number;
    consecutiveTimeouts: number;
  };
  isEliminated: boolean;
}

/** The badge text for a seat, or `null` when the seat is connected with no timeouts. */
export function connectionBadgeLabel(player: ConnectionBadgePlayer): string | null {
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
