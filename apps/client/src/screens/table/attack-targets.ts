/**
 * Target seats — living opponents, plus an eliminated player who still has
 * an attack or a Thief aimed at you (rules spec §1 and §6). The server revalidates.
 */

import { isAttackCardId, type CardId, type PendingEffectView } from '@card-battle/shared';

export interface AttackTargetSeat {
  id: string;
  isEliminated: boolean;
  activePersistentEffects: readonly { cardId: string }[];
}

type PendingPick = Pick<
  PendingEffectView,
  'id' | 'cardId' | 'sourcePlayerId' | 'targetPlayerId'
>;

function seatIsLivingInvisible(player: AttackTargetSeat): boolean {
  return (
    !player.isEliminated &&
    player.activePersistentEffects.some((effect) => effect.cardId === 'invisibility')
  );
}

function corpseSourceIds(
  pendingEffects: readonly PendingPick[],
  you: string,
  matches: (cardId: CardId) => boolean,
): Set<string> {
  const ids = new Set<string>();
  for (const effect of pendingEffects) {
    if (effect.targetPlayerId !== you || effect.id.startsWith('persistent:')) {
      continue;
    }
    if (!matches(effect.cardId)) {
      continue;
    }
    ids.add(effect.sourcePlayerId);
  }
  return ids;
}

function withCorpseCounters<T extends AttackTargetSeat>(
  opponents: readonly T[],
  pendingEffects: readonly PendingPick[],
  you: string,
  matches: (cardId: CardId) => boolean,
): T[] {
  const riposte = corpseSourceIds(pendingEffects, you, matches);
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

/** Eliminated attackers whose attack is still pending on `you`. */
export function riposteAttackerIds(
  pendingEffects: readonly PendingPick[],
  you: string,
): Set<string> {
  return corpseSourceIds(pendingEffects, you, isAttackCardId);
}

export function attackTargetOpponents<T extends AttackTargetSeat>(
  opponents: readonly T[],
  pendingEffects: readonly PendingPick[],
  you: string,
): T[] {
  return withCorpseCounters(opponents, pendingEffects, you, isAttackCardId);
}

export function thiefTargetOpponents<T extends AttackTargetSeat>(
  opponents: readonly T[],
  pendingEffects: readonly PendingPick[],
  you: string,
): T[] {
  return withCorpseCounters(opponents, pendingEffects, you, (cardId) => cardId === 'thief');
}
