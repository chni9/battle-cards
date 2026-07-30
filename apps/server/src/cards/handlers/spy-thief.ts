/**
 * Spy Thief — rules spec §5, backlog L5-04.
 *
 * Queues one pending effect per alive opponent. Resolve: steal all points (upgrade
 * doubles gain) and grant Spy-equivalent visibility. Not counterable; not blocked by
 * upgraded Shield; Untouchable is not immune.
 */

import type { GameState } from '@card-battle/shared';

import { queueEffect } from '../../engine/turn/queue-effect';
import type { CardHandler, EffectContext } from '../handler';

function aliveOpponents(state: GameState, sourcePlayerId: string): string[] {
  return state.players
    .filter((player) => !player.isEliminated && player.id !== sourcePlayerId)
    .map((player) => player.id);
}

export const spyThiefHandler: CardHandler = {
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
        cardId: 'spy-thief',
        isUpgraded: card.isUpgraded,
      });
    }
  },
};
