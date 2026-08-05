/**
 * Ghost kit credit — rules spec §4, technical spec v4 §4.6 / #V4-22, L28-01.
 *
 * Caller-side only: never enrich `applyDamage` / `applyLifeLoss` (golden rule 2).
 * Credits 2 points per life *actually* lost. Cloning's resource copy and
 * elimination bookkeeping that zeros already-0 lives must not call this.
 */

import type { Player } from '@card-battle/shared';

import { gainPoints } from '../economy/gain-points';

export function creditGhostLifeLoss(player: Player, livesLost: number): void {
  if (player.kitId !== 'ghost' || livesLost <= 0) {
    return;
  }

  gainPoints(player, 2 * livesLost, 'direct');
}
