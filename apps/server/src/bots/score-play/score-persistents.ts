/**
 * Persistent specials — Poison, Curse, Super Absorber (L29-06) — plus Sentence,
 * Imposition, Spy Thief and Points Generator, moved here from `score-core.ts` and
 * retuned in the same change (decisions.md 2026-08-05). `cloning` outside an incoming
 * threat stays in `score-core.ts` — it is not persistent, just already branched there.
 */

import { getKit, type BotReasonCode, type PlayingStateView } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import {
  CURSE_DENY_BONUS,
  CURSE_HIGH_SPEND_THRESHOLD,
  CURSE_INVEST_BONUS,
  HEURISTIC_BAND_WEIGHTS,
  IMPOSITION_INVEST_BONUS,
  POINTS_GENERATOR_INVEST_BONUS,
  POISON_INVEST_BONUS,
  POISON_MULTI_TARGET_BONUS,
  SENTENCE_UPGRADED_PER_OPPONENT,
  SPY_THIEF_DENY_BONUS,
  SUPER_ABSORBER_BASELINE_DENY_BONUS,
  SUPER_ABSORBER_POINTS_DENY_BONUS,
  SUPER_ABSORBER_UP_DENY_BONUS,
} from '../heuristic-weights';
import {
  findOwnCard,
  hasOwnPersistent,
  isImmuneTarget,
  type PolicyContext,
} from '../policy-internals';
import { unscoredPlayCardFallthrough } from './fallthrough';

export function scorePersistentsPlayCard(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  // Re-find like `score-core.ts` — see that file's header comment for why.
  const instance = findOwnCard(view, action.instanceId);

  if (instance === undefined) {
    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  const { cardId, isUpgraded } = instance;

  // Sentence — base draw includes self (no eliminator reward on self-elim). Refuse base.
  // Upgraded: random living opponent only → lethal-now (guaranteed one elim).
  if (cardId === 'sentence') {
    if (!isUpgraded) {
      return { score: Number.NEGATIVE_INFINITY, code: 'lethal-now' };
    }

    const opponents = view.players.filter(
      (player) => player.id !== view.you && !player.isEliminated,
    ).length;

    if (opponents < 1) {
      return { score: Number.NEGATIVE_INFINITY, code: 'lethal-now' };
    }

    return {
      score: HEURISTIC_BAND_WEIGHTS.lethalNow + opponents * SENTENCE_UPGRADED_PER_OPPONENT,
      code: 'lethal-now',
    };
  }

  // Imposition / Points Generator — activate once; Invest economy (not draw-tied).
  if (cardId === 'imposition') {
    if (hasOwnPersistent(view, 'imposition')) {
      return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
    }

    return {
      score: HEURISTIC_BAND_WEIGHTS.invest + IMPOSITION_INVEST_BONUS,
      code: 'invest',
    };
  }

  if (cardId === 'points-generator') {
    if (hasOwnPersistent(view, 'points-generator')) {
      return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
    }

    return {
      score: HEURISTIC_BAND_WEIGHTS.invest + POINTS_GENERATOR_INVEST_BONUS,
      code: 'invest',
    };
  }

  // Spy Thief — steal all points + Spy all (Untouchable is not immune). Deny band.
  if (cardId === 'spy-thief') {
    const living = view.players.filter(
      (player) => player.id !== view.you && !player.isEliminated,
    );
    const unspied = living.filter((player) => player.spied === undefined).length;

    return {
      score:
        HEURISTIC_BAND_WEIGHTS.deny +
        SPY_THIEF_DENY_BONUS +
        living.length * 10 +
        unspied * 20,
      code: 'deny',
    };
  }

  if (cardId === 'poison') {
    return scorePoison(view);
  }

  if (cardId === 'curse') {
    return scoreCurse(view, action, ctx);
  }

  if (cardId === 'super-absorber') {
    return scoreSuperAbsorber(view, ctx, isUpgraded);
  }

  return unscoredPlayCardFallthrough();
}

function scorePoison(view: PlayingStateView): { score: number; code: BotReasonCode } {
  if (hasOwnPersistent(view, 'poison')) {
    return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  const living = view.players.filter(
    (player) => player.id !== view.you && !player.isEliminated,
  ).length;

  if (living === 0) {
    return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  const multiTargetBonus = living >= 2 ? POISON_MULTI_TARGET_BONUS : 0;

  return {
    score: HEURISTIC_BAND_WEIGHTS.invest + POISON_INVEST_BONUS + multiTargetBonus,
    code: 'invest',
  };
}

function scoreCurse(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  if (action.targetPlayerId === undefined) {
    return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
  }

  const targetId = action.targetPlayerId;

  if (isImmuneTarget(view, targetId, 'curse')) {
    return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
  }

  const target = view.players.find((player) => player.id === targetId);

  if (target === undefined || target.isEliminated || target.isYou) {
    return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
  }

  // One Curse per victim — a second copy on an already-cursed seat wastes a card.
  const alreadyCursedByUs = view.self.activePersistentEffects.some(
    (effect) => effect.cardId === 'curse' && effect.targetPlayerId === targetId,
  );

  if (alreadyCursedByUs) {
    return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
  }

  const spentLastTurn = ctx.lastTurnPointsSpent.get(targetId) ?? 0;
  const onTopThreat = targetId === ctx.threatOrder[0];

  if (spentLastTurn >= CURSE_HIGH_SPEND_THRESHOLD || onTopThreat) {
    return {
      score: HEURISTIC_BAND_WEIGHTS.deny + CURSE_DENY_BONUS + spentLastTurn,
      code: 'deny',
    };
  }

  // No strong signal yet — still worth activating on a living target (drips over time).
  return {
    score: HEURISTIC_BAND_WEIGHTS.invest + CURSE_INVEST_BONUS,
    code: 'invest',
  };
}

function scoreSuperAbsorber(
  view: PlayingStateView,
  ctx: PolicyContext,
  isUpgraded: boolean,
): { score: number; code: BotReasonCode } {
  if (hasOwnPersistent(view, 'super-absorber')) {
    return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
  }

  const living = view.players.filter(
    (player) => player.id !== view.you && !player.isEliminated,
  );

  if (living.length === 0) {
    return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
  }

  let bestUpgradeSpend = 0;
  let bestPointsSpend = 0;
  let bestLivesLost = 0;

  for (const player of living) {
    bestUpgradeSpend = Math.max(
      bestUpgradeSpend,
      ctx.lastTurnUpgradePointsSpent.get(player.id) ?? 0,
    );
    bestPointsSpend = Math.max(bestPointsSpend, ctx.lastTurnPointsSpent.get(player.id) ?? 0);
    bestLivesLost = Math.max(bestLivesLost, ctx.lastCompleteTurnLoss.get(player.id) ?? 0);
  }

  const kitDraw = getKit(view.self.kitId).startingResources.draw;

  if (isUpgraded && bestUpgradeSpend > 0) {
    return {
      score: HEURISTIC_BAND_WEIGHTS.deny + SUPER_ABSORBER_UP_DENY_BONUS + bestUpgradeSpend * 10,
      code: 'deny',
    };
  }

  if (isUpgraded && bestPointsSpend > kitDraw) {
    return {
      score: HEURISTIC_BAND_WEIGHTS.deny + SUPER_ABSORBER_POINTS_DENY_BONUS + bestPointsSpend,
      code: 'deny',
    };
  }

  // Passive baseline — it absorbs every opponent's next turn regardless of signal today.
  return {
    score: HEURISTIC_BAND_WEIGHTS.deny + SUPER_ABSORBER_BASELINE_DENY_BONUS + bestLivesLost * 5,
    code: 'deny',
  };
}
