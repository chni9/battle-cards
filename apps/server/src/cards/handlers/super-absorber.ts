/**
 * Super Absorber — rules spec §5, backlog L22-03, #V4-21.
 * Activates persistent counter 2; absorbs opponent spend on each victim's turn.
 */

import { activatePersistentEffect } from '../../engine/specials/activate-persistent';
import type { CardHandler } from '../handler';

const SUPER_ABSORBER_COUNTER = 2;

export const superAbsorberHandler: CardHandler = {
  canPlay(context): boolean {
    return context.targetPlayerId === null;
  },

  play(context): void {
    activatePersistentEffect({
      state: context.state,
      ownerPlayerId: context.sourcePlayerId,
      cardId: 'super-absorber',
      isUpgraded: context.card.isUpgraded,
      counter: SUPER_ABSORBER_COUNTER,
      targetPlayerId: null,
    });
  },
};
