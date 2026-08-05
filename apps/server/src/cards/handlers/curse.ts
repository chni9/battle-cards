/**
 * Curse — rules spec §5, backlog L22-02, #V4-20.
 * Activates a no-counter persistent aimed at one opponent; ticks in apply-persistent-effects.
 */

import { activatePersistentEffect } from '../../engine/specials/activate-persistent';
import type { CardHandler } from '../handler';

export const curseHandler: CardHandler = {
  canPlay(context): boolean {
    if (context.targetPlayerId === null) {
      return false;
    }

    const target = context.state.players.find((player) => player.id === context.targetPlayerId);

    return target !== undefined && !target.isEliminated && target.id !== context.sourcePlayerId;
  },

  play(context): void {
    if (context.targetPlayerId === null) {
      throw new Error('curse play requires a target');
    }

    activatePersistentEffect({
      state: context.state,
      ownerPlayerId: context.sourcePlayerId,
      cardId: 'curse',
      isUpgraded: context.card.isUpgraded,
      counter: null,
      targetPlayerId: context.targetPlayerId,
    });
  },
};
