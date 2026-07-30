/**
 * Apply persistent effects that act on the current player after their action —
 * technical spec §4.3 step 4, rules spec §5–§6.
 *
 * Imposition (on victims) and Points Generator (on the user) fill this in L5-05 / L5-08.
 * L5-02 only wires the turn-loop hook so later cards do not restructure the loop.
 */

import type { GameState } from '@card-battle/shared';

import { findPlayer } from './advance-turn';

export function applyPersistentEffects(_state: GameState, playerId: string): void {
  const player = findPlayer(_state, playerId);

  if (player === undefined || player.isEliminated) {
    return;
  }

  // L5-05 Imposition / L5-08 Points Generator dispatch by cardId.
}
