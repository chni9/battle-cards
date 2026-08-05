/**
 * Poison — rules spec §5, backlog L22-01.
 * Activates persistent counter 3; ticks on each opponent's turn in apply-persistent-effects.
 */

import { activatePersistentEffect } from '../../engine/specials/activate-persistent';
import type { CardHandler } from '../handler';

const POISON_COUNTER = 3;

export const poisonHandler: CardHandler = {
  canPlay(context): boolean {
    return context.targetPlayerId === null;
  },

  play(context): void {
    activatePersistentEffect({
      state: context.state,
      ownerPlayerId: context.sourcePlayerId,
      cardId: 'poison',
      isUpgraded: context.card.isUpgraded,
      counter: POISON_COUNTER,
      targetPlayerId: null,
    });
  },
};
