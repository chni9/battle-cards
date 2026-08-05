/**
 * Upgrade Point Thief — rules spec §5, backlog L21-02.
 *
 * Queues one pending effect per alive opponent. Resolve: steal all unspent UP,
 * strip upgrades (hand, specials, shield, active persistents — #V4-17), grant 1 UP
 * per strip; upgraded also steals all points. Not counterable (#V4-33).
 */

import type { GameState } from '@card-battle/shared';

import { queueEffect } from '../../engine/turn/queue-effect';
import type { CardHandler, EffectContext } from '../handler';

function aliveOpponents(state: GameState, sourcePlayerId: string): string[] {
  return state.players
    .filter((player) => !player.isEliminated && player.id !== sourcePlayerId)
    .map((player) => player.id);
}

export const upgradePointThiefHandler: CardHandler = {
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
        cardId: 'upgrade-point-thief',
        isUpgraded: card.isUpgraded,
      });
    }
  },
};
