/**
 * Claim-seat picker copy — PROTOCOL_VERSION 32 / L57-13.
 * Playing seated humans do not see the picker (host Draw must stay reachable).
 */

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
