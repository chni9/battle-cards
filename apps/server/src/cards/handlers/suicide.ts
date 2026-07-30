/**
 * Suicide — rules spec §5, backlog L5-03.
 *
 * Queues one pending effect per alive opponent (5 lives + all points on their turn).
 * Base also queues self-elimination on the user's next turn. Both versions credit the
 * user as eliminator of opponents killed by this effect (Lot 5 ruling; rewards in Lot 6).
 */

import type { GameState } from '@card-battle/shared';

import { queueEffect } from '../../engine/turn/queue-effect';
import type { CardHandler, EffectContext } from '../handler';

function aliveOpponents(state: GameState, sourcePlayerId: string): string[] {
  return state.players
    .filter((player) => !player.isEliminated && player.id !== sourcePlayerId)
    .map((player) => player.id);
}

export const suicideHandler: CardHandler = {
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
        cardId: 'suicide',
        isUpgraded: card.isUpgraded,
      });
    }

    if (!card.isUpgraded) {
      queueEffect({
        state,
        sourcePlayerId,
        targetPlayerId: sourcePlayerId,
        cardId: 'suicide',
        isUpgraded: false,
      });
    }
  },
};
