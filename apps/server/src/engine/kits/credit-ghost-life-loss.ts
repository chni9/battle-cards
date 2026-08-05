/**
 * Ghost kit credit — rules spec §4, technical spec v4 §4.6 / #V4-22, L28-01.
 *
 * Caller-side only: never enrich `applyDamage` / `applyLifeLoss` (golden rule 2).
 * Credits 2 points per life *actually* lost. Cloning's resource copy and
 * elimination bookkeeping that zeros already-0 lives must not call this.
 * Routes through `grantPoints` so an active Duplicator can observe (L28-02).
 */

import type { GameState, Player } from '@card-battle/shared';

import { grantPoints } from '../economy/grant-resources';

export function creditGhostLifeLoss(
  state: GameState,
  player: Player,
  livesLost: number,
): void {
  if (player.kitId !== 'ghost' || livesLost <= 0) {
    return;
  }

  grantPoints(state, player, 2 * livesLost, 'direct');
}
