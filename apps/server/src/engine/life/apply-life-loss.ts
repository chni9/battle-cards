/**
 * Life loss that is not damage — Tax's cost, Suicide, Imposition's ceded life
 * (rules spec §1, §3, §5, technical spec §4.2).
 *
 * Deliberately a file of its own, next to but separate from `applyDamage`. The shield
 * protects against attacks only, and only damage moves a card's internal counter, so
 * this function reads neither `shield` nor `activePersistentEffects`.
 */

import type { LifeLossReason, Player } from '@card-battle/shared';

import type { LifeLossOutcome } from './outcome';

/**
 * Removes `amount` lives from `target`, ignoring the shield entirely — a player behind a
 * full shield still pays Tax's life (rules spec §3).
 *
 * Lives are floored at 0 and elimination is *not* processed here — the turn loop checks
 * it in its own step (technical spec §4.3).
 */
export function applyLifeLoss(
  target: Player,
  amount: number,
  reason: LifeLossReason,
): LifeLossOutcome {
  if (amount < 0) {
    // A negative amount would turn a cost into a life gain. No rule produces one.
    throw new RangeError(`applyLifeLoss received a negative amount: ${amount}`);
  }

  const livesLost = Math.min(target.lives, amount);
  target.lives -= livesLost;

  return { reason, livesLost };
}
