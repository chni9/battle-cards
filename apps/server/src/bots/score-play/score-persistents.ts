/**
 * Persistent specials — Poison, Curse, Super Absorber.
 *
 * Stub for L29-01 (pure refactor). Sentence / Imposition / Spy Thief / Points Generator
 * and Cloning-outside-threat already have a branch and stay routed to `'core'`.
 * L29-06 gives Poison/Curse/Super Absorber a real branch here.
 */

import type { BotReasonCode, PlayingStateView } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import type { PolicyContext } from '../policy-internals';
import { unscoredPlayCardFallthrough } from './fallthrough';

export function scorePersistentsPlayCard(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  // Params kept for the family-dispatch signature — L29-06 will score against them.
  void view;
  void action;
  void ctx;
  return unscoredPlayCardFallthrough();
}
