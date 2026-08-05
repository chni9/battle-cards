/**
 * Block — rules spec §5, backlog L25-01.
 *
 * Cancels pending effects targeting the user (#V4-7: pending queue only), then
 * grants 3 consecutive turns (7 upgraded) with attack play banned. Each cancel
 * pushes `outcome: 'blocked'` onto `context.immediateResolved`.
 */

import { findPlayer } from '../../engine/turn/advance-turn';
import {
  cancelPendingEffect,
  toBlockedActionResolved,
} from '../../engine/turn/cancel-pending-effect';
import { grantBlockTurns } from '../../engine/turn/grant-block-turns';
import type { CardHandler } from '../handler';

const BLOCK_TURNS_BASE = 3;
const BLOCK_TURNS_UPGRADED = 7;

export const blockHandler: CardHandler = {
  canPlay(context): boolean {
    return context.targetPlayerId === null;
  },

  play(context): void {
    const { state, sourcePlayerId, card, immediateResolved } = context;
    const actor = findPlayer(state, sourcePlayerId);

    if (actor === undefined) {
      return;
    }

    const pendingIds = actor.pendingEffects.map((effect) => effect.id);

    for (const effectId of pendingIds) {
      const blocked = cancelPendingEffect(state, effectId, 'block');

      if (blocked !== false) {
        immediateResolved.push(toBlockedActionResolved(blocked));
      }
    }

    grantBlockTurns(actor, card.isUpgraded ? BLOCK_TURNS_UPGRADED : BLOCK_TURNS_BASE);
  },
};
