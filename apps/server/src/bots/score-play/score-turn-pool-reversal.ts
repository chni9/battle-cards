/**
 * Turn-flow, pool and reversal specials — Block, Invisibility, Card Absorber,
 * Card Transformer, Reanimation (L29-08).
 */

import { getKit, type BotReasonCode, type PlayingStateView } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import { lifeThresholdBasesFromWeights, regenSoftLifeForKit } from '../heuristic-life-thresholds';
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
    return scoreInvisibility(view, ctx);
  }

  if (cardId === 'card-absorber') {
    return scoreCardAbsorber(view, ctx);
  }

  if (cardId === 'card-transformer') {
    return scoreCardTransformer(view, action, ctx);
  }

  if (cardId === 'reanimation') {
    return scoreReanimation(view, ctx);
  }

  return unscoredPlayCardFallthrough(ctx.weights);
}

function scoreBlock(
  view: PlayingStateView,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  const hasPendingOnSelf = view.pendingEffects.some((effect) => effect.targetPlayerId === view.you);

  // Cancels every pending effect on self and grants consecutive turns — never a play
  // to skip: Survive under threat, Invest as a proactive setup otherwise.
  if (ctx.incomingThreat > 0 || hasPendingOnSelf) {
    return { score: ctx.weights.action.bands.survive + ctx.weights.action.blockSurviveBonus, code: 'survive' };
  }

  return { score: ctx.weights.action.bands.invest + ctx.weights.action.blockInvestBonus, code: 'invest' };
}

function scoreInvisibility(view: PlayingStateView, ctx: PolicyContext): { score: number; code: BotReasonCode } {
  if (hasOwnPersistent(view, 'invisibility')) {
    return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  return {
    score: ctx.weights.action.bands.invest + ctx.weights.action.invisibilityInvestBonus,
    code: 'invest',
  };
}

function scoreCardAbsorber(view: PlayingStateView, ctx: PolicyContext): { score: number; code: BotReasonCode } {
  if (view.pool.length === 0) {
    return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  const cardsBonus =
    Math.min(ctx.weights.action.cardAbsorberMaxBonusCards, view.pool.length) * ctx.weights.action.cardAbsorberPerCardBonus;

  return {
    score: ctx.weights.action.bands.invest + ctx.weights.action.cardAbsorberInvestBonus + cardsBonus,
    code: 'invest',
  };
}

function scoreCardTransformer(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  if (action.consumeInstanceId === undefined) {
    return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  const consumed = view.self.hand.find((card) => card.instanceId === action.consumeInstanceId);

  if (consumed === undefined) {
    return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  return {
    score: ctx.weights.action.bands.invest + ctx.weights.action.cardTransformerInvestBonus,
    code: 'invest',
  };
}

function scoreReanimation(view: PlayingStateView, ctx: PolicyContext): { score: number; code: BotReasonCode } {
  // The engine already gates a second armed charge (reanimationHandler.canPlay), so
  // this action would not be legal a second time — refused defensively regardless.
  if (hasOwnPersistent(view, 'reanimation')) {
    return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  const startingLives = getKit(view.self.kitId).startingResources.lives;
  const soft = regenSoftLifeForKit(
    startingLives,
    lifeThresholdBasesFromWeights(ctx.weights.action, ctx.weights.lifeThresholds),
  );
  const lowLifeBonus =
    view.self.lives <= soft || view.self.lives <= ctx.weights.action.reanimationLowLifeFloor
      ? ctx.weights.action.reanimationLowLifeBonus
      : 0;

  // Insurance card: always worth arming once available, more urgently at low life —
  // never left to fall through to draw.
  return {
    score: ctx.weights.action.bands.invest + ctx.weights.action.reanimationInvestBonus + lowLifeBonus,
    code: 'invest',
  };
}
