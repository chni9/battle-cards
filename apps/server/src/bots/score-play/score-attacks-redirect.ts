/**
 * Attack / redirection specials — Super Mirror, Attack Thief.
 *
 * Stub for L29-01 (pure refactor). MEGA ATTACK stays routed to `'core'` — it must keep
 * scoring through the existing `isAttackCardId` branches (mutual cancel, lethal-now,
 * burn counter, pressure). L29-07 gives Super Mirror / Attack Thief a real branch here.
 */

import type { BotReasonCode, PlayingStateView } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import type { PolicyContext } from '../policy-internals';
import { unscoredPlayCardFallthrough } from './fallthrough';

export function scoreAttacksPlayCard(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  // Params kept for the family-dispatch signature — L29-07 will score against them.
  void view;
  void action;
  void ctx;
  return unscoredPlayCardFallthrough();
}
