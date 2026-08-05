/**
 * Attack Thief — rules spec §5, backlog L23-03.
 *
 * Arms one block charge on the user and queues a steal pending per alive opponent.
 * Charge is spent at resolve before mutual cancel (#V4-5). Steal filter is shared
 * attacks only (#V4-31). Not counterable (#V4-33).
 */

import type { GameState } from '@card-battle/shared';

import { findPlayer } from '../../engine/turn/advance-turn';
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
    const { state, sourcePlayerId, card } = context;
    const actor = findPlayer(state, sourcePlayerId);

    if (actor === undefined) {
      return;
    }

    actor.attackBlockCharges += 1;

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
