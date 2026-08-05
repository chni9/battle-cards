/**
 * MEGA ATTACK — rules spec §5, backlog L23-01.
 *
 * Queues one pending attack (20 damage) per alive opponent (#V4-1). Shield applies
 * via `applyDamage` on resolve. Assassin multi-attack excludes it (#V4-32).
 */

import type { GameState } from '@card-battle/shared';

import { queueEffect } from '../../engine/turn/queue-effect';
import type { CardHandler, EffectContext } from '../handler';

function aliveOpponents(state: GameState, sourcePlayerId: string): string[] {
  return state.players
    .filter((player) => !player.isEliminated && player.id !== sourcePlayerId)
    .map((player) => player.id);
}

export const megaAttackHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    return context.targetPlayerId === null;
  },

  play(context: EffectContext): void {
    const { state, sourcePlayerId, card } = context;

    for (const targetPlayerId of aliveOpponents(state, sourcePlayerId)) {
      queueEffect({
        state,
        sourcePlayerId,
        targetPlayerId,
        cardId: 'mega-attack',
        isUpgraded: card.isUpgraded,
      });
    }
  },
};
