/**
 * Claim-seat picker copy — PROTOCOL_VERSION 32 / L57-13.
 * Playing seated humans do not see the picker (host Draw must stay reachable).
 */

import type { PublicPlayerView } from '@card-battle/shared';

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

/** Spy overlay present on the wire — L57-16 watching copy follows this fact. */
export function walkInSeesPrivateHands(
  players: readonly Pick<PublicPlayerView, 'spied'>[],
): boolean {
  return players.some((player) => player.spied !== undefined);
}
