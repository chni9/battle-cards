/**
 * Points Generator — rules spec §5. Activates persistent counter 3 (tick in L5-08).
 */

import { activatePersistentEffect } from '../../engine/specials/activate-persistent';
import type { CardHandler } from '../handler';

const POINTS_GENERATOR_COUNTER = 3;

export const pointsGeneratorHandler: CardHandler = {
  canPlay(context): boolean {
    return context.targetPlayerId === null;
  },

  play(context): void {
    activatePersistentEffect({
      state: context.state,
      ownerPlayerId: context.sourcePlayerId,
      cardId: 'points-generator',
      isUpgraded: context.card.isUpgraded,
      counter: POINTS_GENERATOR_COUNTER,
    });
  },
};
