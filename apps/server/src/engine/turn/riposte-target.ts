/**
 * Attack an eliminated player only to answer their still-pending attack (Lot 68).
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
