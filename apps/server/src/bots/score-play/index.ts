/**
 * `scorePlayCard` family dispatcher — L29-01.
 *
 * Pure refactor of the pre-split `scorePlayCard` (technical spec v3 §4.4, §4.6 / L16-04):
 * splits a 239-line function by card family before L29-05..L29-08 add fourteen branches.
 * Zero behaviour change — every non-`'core'` family still has no branch, so it falls
 * through to the same score it did before the split (see `families.ts`, `fallthrough.ts`).
 */

import type { BotReasonCode, PlayingStateView } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import { findOwnCard, type PolicyContext } from '../policy-internals';
import { playCardFamily } from './families';
import { scoreAttacksPlayCard } from './score-attacks-redirect';
import { scoreCorePlayCard } from './score-core';
import { scoreEconomyPlayCard } from './score-economy-theft';
import { scorePersistentsPlayCard } from './score-persistents';
import { scoreTurnPoolPlayCard } from './score-turn-pool-reversal';

export function scorePlayCard(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  const instance = findOwnCard(view, action.instanceId);

  if (instance === undefined) {
    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  switch (playCardFamily(instance.cardId)) {
    case 'core':
      return scoreCorePlayCard(view, action, ctx);
    case 'economy':
      return scoreEconomyPlayCard(view, action, ctx);
    case 'persistents':
      return scorePersistentsPlayCard(view, action, ctx);
    case 'attacks':
      return scoreAttacksPlayCard(view, action, ctx);
    case 'turnPool':
      return scoreTurnPoolPlayCard(view, action, ctx);
  }
}
