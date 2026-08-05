/**
 * Invisibility presence — technical spec v4 §5.1 / L25-02 / #V4-9.
 *
 * Public via `activePersistentEffects` (cardId `invisibility`). Kit `immuneTo`
 * stays a separate check (`isImmuneTo`).
 */

import type { Player } from '@card-battle/shared';

export function playerIsInvisible(player: Player): boolean {
  return player.activePersistentEffects.some((effect) => effect.cardId === 'invisibility');
}

/** Opposing-action immunity from Invisibility (not kit traits). */
export function isOpposingActionImmune(player: Player): boolean {
  return playerIsInvisible(player);
}
