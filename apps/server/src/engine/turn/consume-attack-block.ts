/**
 * Attack Thief charge consume — technical spec v4 §5.1, backlog L23-03 / #V4-5.
 *
 * Runs in `resolvePendingEffects` **before** mutual cancel. The ready effect is already
 * dequeued, so this does not call `cancelPendingEffect` (that primitive removes an effect
 * still on a queue — Block uses it). Spending the charge and emitting `outcome: 'blocked'`
 * is the resolve-time equivalent.
 */

import { isAttackCardId, type PendingEffect, type Player } from '@card-battle/shared';

/**
 * If the resolving player holds a charge and `effect` is an attack, spend one charge
 * and return true so the caller can emit `'blocked'` without mutual cancel or damage.
 */
export function consumeAttackBlockCharge(player: Player, effect: PendingEffect): boolean {
  if (!isAttackCardId(effect.cardId)) {
    return false;
  }

  if (player.attackBlockCharges <= 0) {
    return false;
  }

  player.attackBlockCharges -= 1;
  return true;
}
