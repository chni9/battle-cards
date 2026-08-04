/**
 * Mirror — rules spec §3. Redirects a pending attack aimed at the user.
 * Starts a 20s sub-choice; redirect runs before the user's resolve phase.
 */

import {
  listEligibleMirrorTargets,
  MIRROR_SUB_CHOICE_MS,
} from '../../engine/turn/mirror-choice';
import { findPlayer } from '../../engine/turn/advance-turn';
import type { CardHandler, EffectContext } from '../handler';

export const mirrorHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    if (context.targetPlayerId !== null) {
      return false;
    }

    const actor = findPlayer(context.state, context.sourcePlayerId);

    if (actor === undefined) {
      return false;
    }

    return listEligibleMirrorTargets(actor, context.card.isUpgraded).length > 0;
  },

  play(context: EffectContext): void {
    const actor = findPlayer(context.state, context.sourcePlayerId);

    if (actor === undefined) {
      return;
    }

    const eligible = listEligibleMirrorTargets(actor, context.card.isUpgraded);

    context.state.mirrorChoice = {
      playerId: context.sourcePlayerId,
      isUpgraded: context.card.isUpgraded,
      eligibleEffectIds: eligible.map((effect) => effect.id),
      deadlineMs: context.nowMs + MIRROR_SUB_CHOICE_MS,
    };
  },
};
