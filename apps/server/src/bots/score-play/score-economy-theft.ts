/**
 * Economy / theft specials — Upgrade Point Thief, Card Thief, Super Regeneration
 * (L29-05).
 */

import type { BotReasonCode, PlayingStateView } from '@card-battle/shared';
import { getKit } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import { regenSoftLifeForKit } from '../heuristic-life-thresholds';
import {
  CARD_THIEF_DENY_BONUS,
  HEURISTIC_BAND_WEIGHTS,
  SUPER_REGEN_INVEST_BONUS,
  SUPER_REGEN_SURVIVE_BONUS,
  UPGRADE_POINT_THIEF_DENY_BONUS,
} from '../heuristic-weights';
import { findOwnCard, isImmuneTarget, type PolicyContext } from '../policy-internals';
import { unscoredPlayCardFallthrough } from './fallthrough';

export function scoreEconomyPlayCard(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  // Re-find like `score-core.ts` — the dispatcher already resolved the instance once,
  // but each family function stays self-sufficient (no shared mutable state across them).
  const instance = findOwnCard(view, action.instanceId);

  if (instance === undefined) {
    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  const { cardId, isUpgraded } = instance;

  if (cardId === 'super-regeneration') {
    return scoreSuperRegeneration(view, ctx, isUpgraded);
  }

  if (cardId === 'upgrade-point-thief') {
    return scoreUpgradePointThief(view);
  }

  if (cardId === 'card-thief') {
    return scoreCardThief(view, action, isUpgraded);
  }

  return unscoredPlayCardFallthrough();
}

function scoreSuperRegeneration(
  view: PlayingStateView,
  ctx: PolicyContext,
  isUpgraded: boolean,
): { score: number; code: BotReasonCode } {
  if (ctx.incomingThreat > 0) {
    return {
      score:
        HEURISTIC_BAND_WEIGHTS.survive + SUPER_REGEN_SURVIVE_BONUS + (isUpgraded ? 10 : 0),
      code: 'survive',
    };
  }

  const startingLives = getKit(view.self.kitId).startingResources.lives;
  const soft = regenSoftLifeForKit(startingLives);

  if (view.self.lives <= soft || (isUpgraded && view.self.lives <= soft + 3)) {
    return {
      score:
        HEURISTIC_BAND_WEIGHTS.invest + SUPER_REGEN_INVEST_BONUS + (isUpgraded ? 15 : 0),
      code: 'invest',
    };
  }

  // Full-health idle: never rng-tie with draw.
  return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
}

function scoreUpgradePointThief(
  view: PlayingStateView,
): { score: number; code: BotReasonCode } {
  const living = view.players.filter(
    (player) => player.id !== view.you && !player.isEliminated,
  );

  if (living.length === 0) {
    return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
  }

  let intelBonus = 0;

  for (const player of living) {
    const spied = player.spied;

    if (spied === undefined) {
      continue;
    }

    const hasUpgradedCard =
      spied.hand.some((card) => card.isUpgraded) ||
      spied.specialCards.some((card) => card.isUpgraded);

    if ((spied.upgradePoints !== undefined && spied.upgradePoints > 0) || hasUpgradedCard) {
      intelBonus += 20;
    }
  }

  // Mass effect always valuable even with no intel — scales with living opponents so
  // it stays strictly above draw on any table size.
  return {
    score:
      HEURISTIC_BAND_WEIGHTS.deny +
      UPGRADE_POINT_THIEF_DENY_BONUS +
      living.length * 15 +
      intelBonus,
    code: 'deny',
  };
}

function scoreCardThief(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  isUpgraded: boolean,
): { score: number; code: BotReasonCode } {
  if (isUpgraded) {
    const living = view.players.filter(
      (player) => player.id !== view.you && !player.isEliminated,
    );

    if (living.length === 0) {
      return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
    }

    return {
      score: HEURISTIC_BAND_WEIGHTS.deny + CARD_THIEF_DENY_BONUS + living.length * 10,
      code: 'deny',
    };
  }

  if (action.targetPlayerId === undefined) {
    return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
  }

  if (isImmuneTarget(view, action.targetPlayerId, 'card-thief')) {
    return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
  }

  const target = view.players.find((player) => player.id === action.targetPlayerId);
  const spied = target?.spied;
  const knownCardsBonus =
    spied !== undefined && spied.hand.length + spied.specialCards.length > 0 ? 15 : 0;

  return {
    score: HEURISTIC_BAND_WEIGHTS.deny + CARD_THIEF_DENY_BONUS + knownCardsBonus,
    code: 'deny',
  };
}
