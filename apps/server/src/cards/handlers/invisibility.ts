/**
 * Invisibility — rules spec §5, backlog L25-02.
 *
 * Persistent with `counter: null` (manual deactivate only). +4 points/turn
 * (+6 upgraded) via apply-persistent-effects. Immunity scoped by #V4-9.
 */

import { activatePersistentEffect } from '../../engine/specials/activate-persistent';
import type { CardHandler } from '../handler';

export const invisibilityHandler: CardHandler = {
  canPlay(context): boolean {
    return context.targetPlayerId === null;
  },

  play(context): void {
    activatePersistentEffect({
      state: context.state,
      ownerPlayerId: context.sourcePlayerId,
      cardId: 'invisibility',
      isUpgraded: context.card.isUpgraded,
      counter: null,
      targetPlayerId: null,
    });
  },
};
