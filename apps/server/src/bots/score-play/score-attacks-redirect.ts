/**
 * Attack / redirection specials — MEGA ATTACK, Super Mirror, Attack Thief (L29-07).
 *
 * MEGA ATTACK moved here from `'core'` (see `families.ts`) — its `playCard` action is
 * always target-less (hits every alive opponent at once), so none of core's per-target
 * `isAttackCardId` branches ever matched it before this task.
 */

import {
  attackDamageFor,
  isAttackCardId,
  isSharedAttackCardId,
  type BotReasonCode,
  type PlayingStateView,
} from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import {
  findOwnCard,
  hasCancelingIncomingFrom,
  knownOpponentLives,
  type PolicyContext,
} from '../policy-internals';
import { unscoredPlayCardFallthrough } from './fallthrough';

export function scoreAttacksPlayCard(
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

  if (cardId === 'mega-attack') {
    return scoreMegaAttack(view, ctx, isUpgraded);
  }

  if (cardId === 'super-mirror') {
    return scoreSuperMirror(view, ctx, isUpgraded);
  }

  if (cardId === 'attack-thief') {
    return scoreAttackThief(view, ctx);
  }

  return unscoredPlayCardFallthrough(ctx.weights);
}

function scoreMegaAttack(
  view: PlayingStateView,
  ctx: PolicyContext,
  isUpgraded: boolean,
): { score: number; code: BotReasonCode } {
  const living = view.players.filter(
    (player) => player.id !== view.you && !player.isEliminated,
  );

  if (living.length === 0) {
    return { score: Number.NEGATIVE_INFINITY, code: 'pressure' };
  }

  const damage = attackDamageFor('mega-attack', isUpgraded);

  // Hits every opponent at once — if any of them has a pending attack on us that this
  // damage cancels, that alone justifies playing it (mirrors core's per-target rule).
  if (living.some((player) => hasCancelingIncomingFrom(view, player.id, damage))) {
    return {
      score: ctx.weights.action.bands.survive + ctx.weights.action.mutualCancelBonus + damage,
      code: 'survive',
    };
  }

  const anyLethal = living.some((player) => {
    const knownLives = knownOpponentLives(view, player.id);
    return knownLives !== null && knownLives > 0 && damage >= knownLives;
  });

  if (anyLethal) {
    return { score: ctx.weights.action.bands.lethalNow + damage, code: 'lethal-now' };
  }

  return {
    score:
      ctx.weights.action.bands.pressure +
      living.length * ctx.weights.action.megaAttackPressurePerOpponent +
      damage,
    code: 'pressure',
  };
}

function scoreSuperMirror(
  view: PlayingStateView,
  ctx: PolicyContext,
  isUpgraded: boolean,
): { score: number; code: BotReasonCode } {
  if (ctx.incomingThreat <= 0) {
    return { score: Number.NEGATIVE_INFINITY, code: 'survive' };
  }

  const hasPendingAttackOnSelf = view.pendingEffects.some(
    (effect) => effect.targetPlayerId === view.you && isAttackCardId(effect.cardId),
  );

  if (!hasPendingAttackOnSelf) {
    return { score: Number.NEGATIVE_INFINITY, code: 'survive' };
  }

  return {
    score:
      ctx.weights.action.bands.survive +
      ctx.weights.action.superMirrorSurviveBonus +
      (isUpgraded ? ctx.weights.action.superMirrorUpgradedBonus : 0),
    code: 'survive',
  };
}

function scoreAttackThief(
  view: PlayingStateView,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  // Charge blocks one incoming attack, spent before mutual cancel — worth reaching for
  // under any threat even before the steal resolves.
  if (ctx.incomingThreat > 0) {
    return {
      score: ctx.weights.action.bands.survive + ctx.weights.action.attackThiefSurviveBonus,
      code: 'survive',
    };
  }

  const living = view.players.filter(
    (player) => player.id !== view.you && !player.isEliminated,
  );

  if (living.length === 0) {
    return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
  }

  const likelyHoldsSharedAttack = living.some((player) =>
    player.spied?.hand.some((card) => isSharedAttackCardId(card.cardId)),
  );

  return {
    score:
      ctx.weights.action.bands.deny +
      ctx.weights.action.attackThiefDenyBonus +
      (likelyHoldsSharedAttack ? ctx.weights.action.attackThiefIntelBonus : 0),
    code: 'deny',
  };
}
