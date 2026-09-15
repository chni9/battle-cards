/**
 * Invisibility — rules spec §5, backlog L25-02 / L58-06.
 *
 * Timed pacifist ghost: remaining owner turns in `counter` (4 base / 7 upgraded,
 * activation turn counts). +4 points/turn (+6 upgraded). Immunity scoped by #V4-9.
 * Remaining turns are not card lives.
 */

import { activatePersistentEffect } from '../../engine/specials/activate-persistent';
import type { CardHandler } from '../handler';

export const INVISIBILITY_DURATION_BASE = 4;
export const INVISIBILITY_DURATION_UPGRADED = 7;

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
      counter: context.card.isUpgraded
        ? INVISIBILITY_DURATION_UPGRADED
        : INVISIBILITY_DURATION_BASE,
      targetPlayerId: null,
    });
  },
};
