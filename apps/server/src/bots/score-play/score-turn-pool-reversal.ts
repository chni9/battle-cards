/**
 * Turn-flow, pool and reversal specials — Block, Invisibility, Card Absorber,
 * Card Transformer, Reanimation.
 *
 * Stub for L29-01 (pure refactor). L29-08 gives each card a real branch, plus
 * resolution policies for `deactivatePersistent` / `activateDuplication`.
 */

import type { BotReasonCode, PlayingStateView } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import type { PolicyContext } from '../policy-internals';
import { unscoredPlayCardFallthrough } from './fallthrough';

export function scoreTurnPoolPlayCard(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  // Params kept for the family-dispatch signature — L29-08 will score against them.
  void view;
  void action;
  void ctx;
  return unscoredPlayCardFallthrough();
}
