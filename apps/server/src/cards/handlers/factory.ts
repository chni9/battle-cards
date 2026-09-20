/**
 * Factory — rules spec §5, designer 2026-09-20 / Lot 63.
 * Activates persistent counter 2 (tick in applyPersistentEffects).
 */

import { activatePersistentEffect } from '../../engine/specials/activate-persistent';
import type { CardHandler } from '../handler';

const FACTORY_COUNTER = 2;

export const factoryHandler: CardHandler = {
  canPlay(context): boolean {
    return context.targetPlayerId === null;
  },

  play(context): void {
    activatePersistentEffect({
      state: context.state,
      ownerPlayerId: context.sourcePlayerId,
      cardId: 'factory',
      isUpgraded: context.card.isUpgraded,
      counter: FACTORY_COUNTER,
    });
  },
};
