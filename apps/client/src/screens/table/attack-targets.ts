/**
 * Attack target seats — living opponents, plus an eliminated player who still
 * has an attack aimed at you (rules spec §6, Lot 68). The server revalidates.
 */

import { isAttackCardId, type PendingEffectView } from '@card-battle/shared';

export interface AttackTargetSeat {
  id: string;
  isEliminated: boolean;
  activePersistentEffects: readonly { cardId: string }[];
}

function seatIsLivingInvisible(player: AttackTargetSeat): boolean {
  return (
    !player.isEliminated &&
    player.activePersistentEffects.some((effect) => effect.cardId === 'invisibility')
  );
}

/** Eliminated attackers whose attack is still pending on `you`. */
export function riposteAttackerIds(
  pendingEffects: readonly Pick<
    PendingEffectView,
    'id' | 'cardId' | 'sourcePlayerId' | 'targetPlayerId'
  >[],
  you: string,
): Set<string> {
  const ids = new Set<string>();
  for (const effect of pendingEffects) {
    if (effect.targetPlayerId !== you || effect.id.startsWith('persistent:')) {
      continue;
    }
    if (!isAttackCardId(effect.cardId)) {
      continue;
    }
    ids.add(effect.sourcePlayerId);
  }
  return ids;
}

export function attackTargetOpponents<T extends AttackTargetSeat>(
  opponents: readonly T[],
  pendingEffects: readonly Pick<
    PendingEffectView,
    'id' | 'cardId' | 'sourcePlayerId' | 'targetPlayerId'
  >[],
  you: string,
): T[] {
  const riposte = riposteAttackerIds(pendingEffects, you);
  return opponents.filter((player) => {
    if (seatIsLivingInvisible(player)) {
      return false;
    }
    if (!player.isEliminated) {
      return true;
    }
    return riposte.has(player.id);
  });
}
