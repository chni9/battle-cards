/**
 * Super Absorber — rules spec §5, designer 2026-09-20 / L63-05.
 * Persistent counter 2; no activation snapshot; ticks living opponents after they act.
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
