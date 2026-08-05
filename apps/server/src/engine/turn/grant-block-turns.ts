/**
 * Grant consecutive turns (Block) — technical spec v4 §4.5, L25-01.
 *
 * The counter lives on `Player`, not `PersistentEffect.counter`, because
 * `applyDamage` decrements the latter one point per life lost.
 *
 * `blockAttacksForbidden` is set here and cleared when the seat finally walks
 * away (or when #V4-6 ends the chain early) — not when remaining hits 0, because
 * the last consecutive turn still holds the seat with remaining === 0.
 */

import type { Player } from '@card-battle/shared';

export function grantBlockTurns(player: Player, count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(
      `grantBlockTurns needs a non-negative integer count, received ${String(count)}`,
    );
  }

  player.blockTurnsRemaining = count;
  player.blockAttacksForbidden = count > 0;
}

/** Clear Block chain state — #V4-6 timeout / chain complete (L25-01). */
export function endBlockChain(player: Player): void {
  player.blockTurnsRemaining = 0;
  player.blockAttacksForbidden = false;
}

/** Attack play/use banned during an active Block chain (L25-01). */
export function attacksForbiddenDuringBlock(player: Player): boolean {
  return player.blockAttacksForbidden;
}
