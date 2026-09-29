/**
 * Attack Thief — rules spec §5, backlog L23-03.
 *
 * Blocks every attack already pending against the user, then queues a steal
 * per alive opponent. No charge is kept for a later turn (Lot 68). Steal
 * filter is shared attacks only (#V4-31). Not counterable (#V4-33).
 */

import { isAttackCardId, type GameState } from '@card-battle/shared';

import { findPlayer } from '../../engine/turn/advance-turn';
import {
  cancelPendingEffect,
  toBlockedActionResolved,
} from '../../engine/turn/cancel-pending-effect';
import { queueEffect } from '../../engine/turn/queue-effect';
import type { CardHandler, EffectContext } from '../handler';

function aliveOpponents(state: GameState, sourcePlayerId: string): string[] {
  return state.players
    .filter((player) => !player.isEliminated && player.id !== sourcePlayerId)
    .map((player) => player.id);
}

export const attackThiefHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    return context.targetPlayerId === null;
  },

  play(context: EffectContext): void {
    const { state, sourcePlayerId, card, immediateResolved } = context;
    const actor = findPlayer(state, sourcePlayerId);

    if (actor === undefined) {
      return;
    }

    const pendingAttackIds = actor.pendingEffects
      .filter((effect) => isAttackCardId(effect.cardId))
      .map((effect) => effect.id);

    for (const effectId of pendingAttackIds) {
      const blocked = cancelPendingEffect(state, effectId, 'attack-thief');
      if (blocked !== false) {
        immediateResolved.push(toBlockedActionResolved(blocked));
      }
    }

    for (const targetPlayerId of aliveOpponents(state, sourcePlayerId)) {
      queueEffect({
        state,
        sourcePlayerId,
        targetPlayerId,
        cardId: 'attack-thief',
        isUpgraded: card.isUpgraded,
      });
    }
  },
};
