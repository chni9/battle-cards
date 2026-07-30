/**
 * Imposition — rules spec §5. Activates persistent counter 2 (tick behaviour in L5-05).
 */

import { activatePersistentEffect } from '../../engine/specials/activate-persistent';
import type { CardHandler } from '../handler';

const IMPOSITION_COUNTER = 2;

export const impositionHandler: CardHandler = {
  canPlay(context): boolean {
    return context.targetPlayerId === null;
  },

  play(context): void {
    activatePersistentEffect({
      state: context.state,
      ownerPlayerId: context.sourcePlayerId,
      cardId: 'imposition',
      isUpgraded: context.card.isUpgraded,
      counter: IMPOSITION_COUNTER,
    });
  },
};
