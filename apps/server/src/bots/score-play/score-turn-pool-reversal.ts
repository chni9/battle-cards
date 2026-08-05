/**
 * Turn-flow, pool and reversal specials — Block, Invisibility, Card Absorber,
 * Card Transformer, Reanimation (L29-08).
 */

import { getKit, type BotReasonCode, type PlayingStateView } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import { regenSoftLifeForKit } from '../heuristic-life-thresholds';
import {
  BLOCK_INVEST_BONUS,
  BLOCK_SURVIVE_BONUS,
  CARD_ABSORBER_INVEST_BONUS,
  CARD_ABSORBER_MAX_BONUS_CARDS,
  CARD_ABSORBER_PER_CARD_BONUS,
  CARD_TRANSFORMER_INVEST_BONUS,
  HEURISTIC_BAND_WEIGHTS,
  INVISIBILITY_INVEST_BONUS,
  REANIMATION_INVEST_BONUS,
  REANIMATION_LOW_LIFE_BONUS,
  REANIMATION_LOW_LIFE_FLOOR,
} from '../heuristic-weights';
import { findOwnCard, hasOwnPersistent, type PolicyContext } from '../policy-internals';
import { unscoredPlayCardFallthrough } from './fallthrough';

export function scoreTurnPoolPlayCard(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  // Re-find like `score-core.ts` — see that file's header comment for why.
  const instance = findOwnCard(view, action.instanceId);

  if (instance === undefined) {
    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  const { cardId } = instance;

  if (cardId === 'block') {
    return scoreBlock(view, ctx);
  }

  if (cardId === 'invisibility') {
    return scoreInvisibility(view);
  }

  if (cardId === 'card-absorber') {
    return scoreCardAbsorber(view);
  }

  if (cardId === 'card-transformer') {
    return scoreCardTransformer(view, action);
  }

  if (cardId === 'reanimation') {
    return scoreReanimation(view);
  }

  return unscoredPlayCardFallthrough();
}

function scoreBlock(
  view: PlayingStateView,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  const hasPendingOnSelf = view.pendingEffects.some((effect) => effect.targetPlayerId === view.you);

  // Cancels every pending effect on self and grants consecutive turns — never a play
  // to skip: Survive under threat, Invest as a proactive setup otherwise.
  if (ctx.incomingThreat > 0 || hasPendingOnSelf) {
    return { score: HEURISTIC_BAND_WEIGHTS.survive + BLOCK_SURVIVE_BONUS, code: 'survive' };
  }

  return { score: HEURISTIC_BAND_WEIGHTS.invest + BLOCK_INVEST_BONUS, code: 'invest' };
}

function scoreInvisibility(view: PlayingStateView): { score: number; code: BotReasonCode } {
  if (hasOwnPersistent(view, 'invisibility')) {
    return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  return {
    score: HEURISTIC_BAND_WEIGHTS.invest + INVISIBILITY_INVEST_BONUS,
    code: 'invest',
  };
}

function scoreCardAbsorber(view: PlayingStateView): { score: number; code: BotReasonCode } {
  if (view.pool.length === 0) {
    return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  const cardsBonus =
    Math.min(CARD_ABSORBER_MAX_BONUS_CARDS, view.pool.length) * CARD_ABSORBER_PER_CARD_BONUS;

  return {
    score: HEURISTIC_BAND_WEIGHTS.invest + CARD_ABSORBER_INVEST_BONUS + cardsBonus,
    code: 'invest',
  };
}

function scoreCardTransformer(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
): { score: number; code: BotReasonCode } {
  if (action.consumeInstanceId === undefined) {
    return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  const consumed = view.self.hand.find((card) => card.instanceId === action.consumeInstanceId);

  if (consumed === undefined) {
    return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  return {
    score: HEURISTIC_BAND_WEIGHTS.invest + CARD_TRANSFORMER_INVEST_BONUS,
    code: 'invest',
  };
}

function scoreReanimation(view: PlayingStateView): { score: number; code: BotReasonCode } {
  // The engine already gates a second armed charge (reanimationHandler.canPlay), so
  // this action would not be legal a second time — refused defensively regardless.
  if (hasOwnPersistent(view, 'reanimation')) {
    return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  const startingLives = getKit(view.self.kitId).startingResources.lives;
  const soft = regenSoftLifeForKit(startingLives);
  const lowLifeBonus =
    view.self.lives <= soft || view.self.lives <= REANIMATION_LOW_LIFE_FLOOR
      ? REANIMATION_LOW_LIFE_BONUS
      : 0;

  // Insurance card: always worth arming once available, more urgently at low life —
  // never left to fall through to draw.
  return {
    score: HEURISTIC_BAND_WEIGHTS.invest + REANIMATION_INVEST_BONUS + lowLifeBonus,
    code: 'invest',
  };
}
