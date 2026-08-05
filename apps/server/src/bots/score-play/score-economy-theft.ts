/**
 * Economy / theft specials — Upgrade Point Thief, Card Thief, Super Regeneration.
 *
 * Stub for L29-01 (pure refactor). L29-05 gives each card a real branch with a
 * `botReason` code, never a tie with `draw`.
 */

import type { BotReasonCode, PlayingStateView } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import type { PolicyContext } from '../policy-internals';
import { unscoredPlayCardFallthrough } from './fallthrough';

export function scoreEconomyPlayCard(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  // Params kept for the family-dispatch signature — L29-05 will score against them.
  void view;
  void action;
  void ctx;
  return unscoredPlayCardFallthrough();
}
