/**
 * Reanimation — rules spec §5, backlog L26-01.
 *
 * Arms a persistent (`counter: null`). On a later elimination the charge is
 * consumed and the user revives after rewards (#V4-11 / #V4-12). At most one
 * armed charge — second play is rejected (#V4-12c).
 */

import { activatePersistentEffect } from '../../engine/specials/activate-persistent';
import { findPlayer } from '../../engine/turn/advance-turn';
import type { CardHandler } from '../handler';

export const reanimationHandler: CardHandler = {
  canPlay(context): boolean {
    if (context.targetPlayerId !== null) {
      return false;
    }

    const owner = findPlayer(context.state, context.sourcePlayerId);

    if (owner === undefined) {
      return false;
    }

    // At most one armed Reanimation (#V4-12c).
    return !owner.activePersistentEffects.some((effect) => effect.cardId === 'reanimation');
  },

  play(context): void {
    activatePersistentEffect({
      state: context.state,
      ownerPlayerId: context.sourcePlayerId,
      cardId: 'reanimation',
      isUpgraded: context.card.isUpgraded,
      counter: null,
      targetPlayerId: null,
    });
  },
};
