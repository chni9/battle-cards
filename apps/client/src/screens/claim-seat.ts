/**
 * Claim-seat picker copy — PROTOCOL_VERSION 32 / L57-13.
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
