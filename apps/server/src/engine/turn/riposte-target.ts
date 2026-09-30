/**
 * Answer an eliminated player only while their attack or Thief is still
 * pending on you (Lot 68, designer 2026-09-30).
 */

import { isAttackCardId, type Player } from '@card-battle/shared';

export function eliminatedPlayerHasPendingAttackOn(
  defender: Player,
  attackerId: string,
): boolean {
  return defender.pendingEffects.some(
    (effect) =>
      isAttackCardId(effect.cardId) &&
      effect.sourcePlayerId === attackerId &&
      effect.targetPlayerId === defender.id,
  );
}

export function eliminatedPlayerHasPendingThiefOn(
  defender: Player,
  attackerId: string,
): boolean {
  return defender.pendingEffects.some(
    (effect) =>
      effect.cardId === 'thief' &&
      effect.sourcePlayerId === attackerId &&
      effect.targetPlayerId === defender.id,
  );
}
