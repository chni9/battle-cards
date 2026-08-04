/**
 * Grant consecutive turns (Block) — technical spec v4 §4.5.
 *
 * The counter lives on `Player`, not `PersistentEffect.counter`, because
 * `applyDamage` decrements the latter one point per life lost.
 */

import type { Player } from '@card-battle/shared';

export function grantBlockTurns(player: Player, count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(
      `grantBlockTurns needs a non-negative integer count, received ${String(count)}`,
    );
  }

  player.blockTurnsRemaining = count;
}
