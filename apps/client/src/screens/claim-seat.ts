/**
 * Claim-seat picker copy — PROTOCOL_VERSION 32 / L57-13.
 * Playing seated humans do not see the picker (host Draw must stay reachable).
 */

import type { ClaimableSeatView, PublicPlayerView } from '@card-battle/shared';

export function claimStayLabel(input: {
  isSpectator: boolean;
  phase: 'lobby' | 'playing' | 'finished';
}): string {
  if (input.phase === 'lobby' && !input.isSpectator) {
    return 'Keep this seat';
  }

  return 'Stay spectating';
}

/** Who may be asked to sit as a disconnected nickname. */
export function shouldShowClaimPicker(input: {
  claimableCount: number;
  isSpectator: boolean;
  phase: 'lobby' | 'playing' | 'finished';
  youAreHost: boolean;
}): boolean {
  if (input.claimableCount === 0) {
    return false;
  }

  if (input.isSpectator) {
    return true;
  }

  return input.phase === 'lobby' && !input.youAreHost;
}

/**
 * The seat Sit here would claim (L57-13, L57-15): the player's pick while it is still listed, else a
 * sole listed seat (pre-selected so Sit here works at once), else none. Never a nickname match.
 */
export function claimSelection(
  seats: readonly Pick<ClaimableSeatView, 'playerId'>[],
  picked: string | null,
): string | null {
  if (picked !== null && seats.some((seat) => seat.playerId === picked)) {
    return picked;
  }
  const [first] = seats;

  return seats.length === 1 && first !== undefined ? first.playerId : null;
}

/** Spy overlay present on the wire — L57-16 watching copy follows this fact. */
export function walkInSeesPrivateHands(
  players: readonly Pick<PublicPlayerView, 'spied'>[],
): boolean {
  return players.some((player) => player.spied !== undefined);
}
