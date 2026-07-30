/**
 * Damage — life loss inflicted by an attack card (rules spec §1, technical spec §4.2).
 *
 * Deliberately a file of its own, next to but separate from `applyLifeLoss`: the two
 * paths must never be merged, wrapped in a common helper, or selected by a flag.
 */

import type { AttackCardId, Player } from '@card-battle/shared';

import type { CounterDecrement, DamageOutcome } from './outcome';

/**
 * Applies `amount` damage to `target`: the shield absorbs first and the excess carries
 * over to lives (rules spec §1), then each of the hit player's active internal counters
 * loses one point per life lost (rules spec §5).
 *
 * Lives are floored at 0 and elimination is *not* processed here — the turn loop checks
 * it in its own step (technical spec §4.3).
 *
 * `source` is an `AttackCardId` rather than a `CardId` so that calling this from Tax or
 * any other non-attack card fails to compile: the boundary technical spec §4.2 insists
 * on is structural, not a comment.
 */
export function applyDamage(
  target: Player,
  amount: number,
  source: AttackCardId,
): DamageOutcome {
  if (amount < 0) {
    // A negative amount would heal through an attack card. No rule produces one.
    throw new RangeError(`applyDamage received a negative amount: ${amount}`);
  }

  const shieldAbsorbed = Math.min(target.shield, amount);
  target.shield -= shieldAbsorbed;

  if (target.shield === 0) {
    target.shieldIsUpgraded = false;
  }

  const livesLost = Math.min(target.lives, amount - shieldAbsorbed);
  target.lives -= livesLost;

  const countersDecremented: CounterDecrement[] = [];
  const deactivatedEffectIds: string[] = [];

  if (livesLost > 0) {
    for (const effect of target.activePersistentEffects) {
      if (effect.counter === null) {
        continue;
      }

      const lost = Math.min(effect.counter, livesLost);
      effect.counter -= lost;

      if (lost > 0) {
        countersDecremented.push({ effectId: effect.id, cardId: effect.cardId, amount: lost });
      }

      if (effect.counter <= 0) {
        deactivatedEffectIds.push(effect.id);
      }
    }

    if (deactivatedEffectIds.length > 0) {
      const deactivated = new Set(deactivatedEffectIds);
      target.activePersistentEffects = target.activePersistentEffects.filter(
        (effect) => !deactivated.has(effect.id),
      );
    }
  }

  return { source, shieldAbsorbed, livesLost, countersDecremented, deactivatedEffectIds };
}
