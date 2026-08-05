/**
 * View-only heuristic policy — technical spec v3 §4.4, §4.6 (L16-04).
 *
 * `decide` takes no GameState (decision 2). Same view + same rng seed → same action.
 *
 * `scorePlayCard` moved to `./score-play/` (L29-01) — a family dispatcher, split from a
 * single 239-line function before L29-05..L29-08 add fourteen more branches. Shared
 * helpers used by both this file and `score-play/score-core.ts` live in
 * `./policy-internals` so neither side imports the other (no cycle).
 */

import {
  attackDamageFor,
  getCard,
  getKit,
  isAttackCardId,
  isSharedAttackCardId,
  UPGRADE_POINT_ECONOMY,
  type BotDecisionReason,
  type BotReasonCode,
  type CardInstance,
  type PlayingStateView,
  type RewardChoice,
} from '@card-battle/shared';

import type { TurnAction } from '../engine/turn/perform-action';
import type { Rng } from '../engine/rng';
import { SPECIAL_CARD_PURCHASE_COST } from '../engine/economy/buy-special-card';
import {
  BUY_SPECIAL_POINTS_FLOOR,
  BUY_UPGRADE_POINT_BONUS,
  BURN_COUNTER_BONUS,
  CONTEST_UPGRADE_EXTRA,
  DRAW_SCORE_PER_EXTRA_DRAW,
  HEURISTIC_BAND_WEIGHTS,
  REGEN_SOFT_LIFE,
  SELL_TO_FUND_BONUS,
  STRIKE_MIN_DAMAGE,
  TAX_LIFE_BUFFER,
  UNSCORED_PLAY_PENALTY,
  UPGRADE_ABSORBER_BONUS,
  UPGRADE_ATTACK_BONUS,
  UPGRADE_MIRROR_BONUS,
  UPGRADE_REGEN_BONUS,
  UPGRADE_SENTENCE_BONUS,
  UPGRADE_SHIELD_BONUS,
  UPGRADE_TAX_BONUS,
} from './heuristic-weights';
import {
  computePointReserve,
  deriveStance,
  effectDamage,
  findOwnCard,
  hasOpponentBurnTarget,
  hasSpyableUnspiedOpponent,
  knownOpponentLives,
  lastCompleteTurnLivesLostByTarget,
  lastCompleteTurnSpendByActor,
  maxBurnableCounter,
  needsPointsToPlayReadyStrike,
  needsPointsToPlaySpy,
  ownCards,
  ownsCardId,
  rankThreatOpponents,
  sumLivesLostByTarget,
  sumPointsSpentByActor,
  violatesPointReserve,
  type HeuristicStance,
  type PolicyContext,
} from './policy-internals';
import { scorePlayCard } from './score-play';

export type { HeuristicStance };

export interface MirrorPolicyPick {
  pendingEffectId: string;
  newTargetPlayerId: string;
  reason: BotDecisionReason;
}

export interface PolicyDecision {
  action: TurnAction;
  reason: BotDecisionReason;
}

export interface ScoredAction {
  action: TurnAction;
  score: number;
  code: BotReasonCode;
}

export function decide(
  view: PlayingStateView,
  actions: readonly TurnAction[],
  rng: Rng,
): TurnAction {
  return decideWithReason(view, actions, rng).action;
}

export function decideWithReason(
  view: PlayingStateView,
  actions: readonly TurnAction[],
  rng: Rng,
): PolicyDecision {
  if (actions.length === 0) {
    throw new RangeError('decide received an empty action list');
  }

  const scored = scoreActions(view, actions, rng);

  let best = scored[0]?.score ?? Number.NEGATIVE_INFINITY;

  for (const entry of scored) {
    if (entry.score > best) {
      best = entry.score;
    }
  }

  const top = scored.filter((entry) => entry.score === best);
  const pick = rng.pick(top);

  return {
    action: pick.action,
    reason: { code: pick.code },
  };
}

/** Test/diagnostic: score each action under the heuristic (L29-02). */
export function scoreActions(
  view: PlayingStateView,
  actions: readonly TurnAction[],
  rng: Rng,
): readonly ScoredAction[] {
  const ctx = buildContext(view, rng);
  return actions.map((action) => {
    const evaluated = scoreAction(view, action, ctx);
    return { action, score: evaluated.score, code: evaluated.code };
  });
}

export function pickMirrorRedirect(
  view: PlayingStateView,
  rng: Rng,
  /** From `GameState.mirrorChoice.eligibleEffectIds` — base Mirror excludes upgraded hits. */
  eligibleEffectIds?: readonly string[],
): MirrorPolicyPick | null {
  const eligible =
    eligibleEffectIds === undefined ? null : new Set(eligibleEffectIds);
  const incoming = view.pendingEffects.filter((effect) => {
    if (effect.targetPlayerId !== view.you || !isAttackCardId(effect.cardId)) {
      return false;
    }

    if (eligible !== null && !eligible.has(effect.id)) {
      return false;
    }

    return true;
  });

  if (incoming.length === 0) {
    return null;
  }

  // Prefer highest damage pending (Mirror doubles via damageMultiplier after redirect).
  const rankedEffects = [...incoming].sort((left, right) => {
    const leftDmg = effectDamage(left.cardId, left.isUpgraded, left.damageMultiplier);
    const rightDmg = effectDamage(right.cardId, right.isUpgraded, right.damageMultiplier);
    return rightDmg - leftDmg;
  });
  const effect = rankedEffects[0];

  if (effect === undefined) {
    return null;
  }

  const targets = rankThreatOpponents(view, rng);
  const newTarget = targets[0];

  if (newTarget === undefined) {
    return null;
  }

  return {
    pendingEffectId: effect.id,
    newTargetPlayerId: newTarget,
    reason: { code: 'mirror-highest-damage' },
  };
}

export interface RewardPolicyPicks {
  choices: [RewardChoice, RewardChoice];
  reason: BotDecisionReason;
}

export function pickEliminationRewards(
  view: PlayingStateView,
  availableCards: readonly CardInstance[],
  lifeLimit: number,
  rng: Rng,
): [RewardChoice, RewardChoice] {
  return pickEliminationRewardsWithReason(view, availableCards, lifeLimit, rng).choices;
}

export function pickEliminationRewardsWithReason(
  view: PlayingStateView,
  availableCards: readonly CardInstance[],
  lifeLimit: number,
  rng: Rng,
): RewardPolicyPicks {
  const pickOne = (claimed: ReadonlySet<string>): RewardChoice => {
    const attackCards = availableCards
      .filter(
        (card) => isAttackCardId(card.cardId) && !claimed.has(card.instanceId),
      )
      .sort((left, right) => {
        if (!isAttackCardId(left.cardId) || !isAttackCardId(right.cardId)) {
          return 0;
        }

        return (
          attackDamageFor(right.cardId, right.isUpgraded) -
          attackDamageFor(left.cardId, left.isUpgraded)
        );
      });

    const bestAttack = attackCards[0];

    if (bestAttack !== undefined) {
      const playCost = getCard(bestAttack.cardId)?.cost.points ?? 0;

      // "Affordable to use later" — tunable: have at least the play cost in hand now.
      if (view.self.points >= playCost) {
        return { type: 'card', instanceId: bestAttack.instanceId };
      }
    }

    if (view.self.lives < Math.floor(lifeLimit / 2)) {
      return { type: 'lives' };
    }

    return { type: 'points' };
  };

  const first = pickOne(new Set());
  const claimed = new Set<string>();

  if (first.type === 'card') {
    claimed.add(first.instanceId);
  }

  let second = pickOne(claimed);

  if (
    first.type === 'card' &&
    second.type === 'card' &&
    first.instanceId === second.instanceId
  ) {
    second = rng.nextInt(2) === 0 ? { type: 'lives' } : { type: 'points' };
  }

  return {
    choices: [first, second],
    reason: {
      code: 'reward-pick',
      params: {
        first: first.type,
        second: second.type,
      },
    },
  };
}

function buildContext(view: PlayingStateView, rng: Rng): PolicyContext {
  let incomingThreat = 0;

  for (const effect of view.pendingEffects) {
    if (effect.targetPlayerId !== view.you || !isAttackCardId(effect.cardId)) {
      continue;
    }

    incomingThreat += effectDamage(effect.cardId, effect.isUpgraded, effect.damageMultiplier);
  }

  const spend = lastCompleteTurnSpendByActor(view);
  const stance = deriveStance(view, incomingThreat);
  const pointReserve = stance === 'contest' ? computePointReserve(view) : 0;

  return {
    incomingThreat,
    threatOrder: rankThreatOpponents(view, rng),
    cumulativeLoss: sumLivesLostByTarget(view),
    lastCompleteTurnLoss: lastCompleteTurnLivesLostByTarget(view),
    lastTurnPointsSpent: spend.points,
    lastTurnUpgradePointsSpent: spend.upgradePoints,
    observedSpend: sumPointsSpentByActor(view),
    stance,
    pointReserve,
    rng,
  };
}

function scoreAction(
  view: PlayingStateView,
  action: TurnAction,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  if (action.type === 'draw') {
    const kitDraw = getKit(view.self.kitId).startingResources.draw;
    return {
      score: HEURISTIC_BAND_WEIGHTS.sustain + DRAW_SCORE_PER_EXTRA_DRAW * Math.max(0, kitDraw - 1),
      code: 'sustain',
    };
  }

  if (action.type === 'playCard') {
    return scorePlayCard(view, action, ctx);
  }

  if (action.type === 'playMultipleAttacks') {
    return scoreMultiAttack(view, action, ctx);
  }

  if (action.type === 'buyUpgradePoint' || action.type === 'upgradeCard') {
    if (action.type === 'buyUpgradePoint') {
      if (violatesPointReserve(view, ctx, view.self.points - UPGRADE_POINT_ECONOMY.buyCostPoints)) {
        return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
      }

      const hasPriorityUpgrade = ownCards(view).some(
        (card) =>
          !card.isUpgraded &&
          (card.cardId === 'tax' ||
            card.cardId === 'regeneration' ||
            card.cardId === 'mirror' ||
            card.cardId === 'shield' ||
            card.cardId === 'absorber' ||
            card.cardId === 'sentence' ||
            isAttackCardId(card.cardId)),
      );

      return {
        score:
          HEURISTIC_BAND_WEIGHTS.invest +
          BUY_UPGRADE_POINT_BONUS +
          (hasPriorityUpgrade ? 20 : 0),
        code: 'invest',
      };
    }

    const bonus = secondaryInvest(view, action, ctx);

    return {
      score: HEURISTIC_BAND_WEIGHTS.invest + bonus,
      code: 'invest',
    };
  }

  if (action.type === 'buyCard') {
    // Policy: never stock a second copy — engine allows it; bots waste turns/resources.
    if (ownsCardId(view, action.cardId)) {
      return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
    }

    const definition = getCard(action.cardId);
    const lifeCost = definition?.buyCost.lives ?? 0;
    const pointCost =
      definition?.buyCost !== undefined && 'points' in definition.buyCost
        ? definition.buyCost.points
        : 0;

    if (pointCost > 0 && violatesPointReserve(view, ctx, view.self.points - pointCost)) {
      return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
    }

    // Tax (and any life-priced shop buy) can legally leave the buyer at 0 lives.
    // Never choose a lethal or buffer-breaking life buy — same safety floor as playing Tax.
    if (lifeCost > 0) {
      const livesAfter = view.self.lives - lifeCost;

      if (livesAfter <= 0 || livesAfter <= ctx.incomingThreat + TAX_LIFE_BUFFER) {
        return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
      }
    }

    // Under fire: prefer stocking Regeneration (life buys next turn) over random shop.
    // Still Invest-band — never outranks a same-turn Survive play.
    if (action.cardId === 'regeneration' && ctx.incomingThreat > 0) {
      return { score: HEURISTIC_BAND_WEIGHTS.invest + 40, code: 'invest' };
    }

    if (
      (action.cardId === 'shield' || action.cardId === 'mirror') &&
      (ctx.incomingThreat > 0 || ctx.stance === 'contest')
    ) {
      return { score: HEURISTIC_BAND_WEIGHTS.invest + 30, code: 'invest' };
    }

    // Economy / kill tools / intel before filler shop buys.
    // ONMMBZ: do not buy Tax when Spy is held but unaffordable — sell to fund Spy instead.
    if (action.cardId === 'tax') {
      if (needsPointsToPlaySpy(view)) {
        return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
      }

      return { score: HEURISTIC_BAND_WEIGHTS.invest + 35, code: 'invest' };
    }

    if (action.cardId === 'spy' && hasSpyableUnspiedOpponent(view)) {
      return { score: HEURISTIC_BAND_WEIGHTS.invest + 55, code: 'invest' };
    }

    if (action.cardId === 'super-attack') {
      return { score: HEURISTIC_BAND_WEIGHTS.invest + 30, code: 'invest' };
    }

    return { score: HEURISTIC_BAND_WEIGHTS.invest + 10, code: 'invest' };
  }

  if (action.type === 'buySpecialCard') {
    if (view.self.points < BUY_SPECIAL_POINTS_FLOOR) {
      return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
    }

    if (
      violatesPointReserve(view, ctx, view.self.points - SPECIAL_CARD_PURCHASE_COST)
    ) {
      return { score: Number.NEGATIVE_INFINITY, code: 'invest' };
    }

    return { score: HEURISTIC_BAND_WEIGHTS.invest, code: 'invest' };
  }

  if (action.type === 'sellCard') {
    return scoreSellCard(view, action, ctx);
  }

  if (action.type === 'deactivatePersistent') {
    // L25-02: must not fall through to sellUpgradePoint. Full policy is L29-08.
    const underPressure = ctx.incomingThreat > 0;
    return {
      score: underPressure
        ? HEURISTIC_BAND_WEIGHTS.sustain - UNSCORED_PLAY_PENALTY
        : HEURISTIC_BAND_WEIGHTS.sustain - 5,
      code: 'sustain',
    };
  }

  if (action.type === 'activateDuplication') {
    // L28-02: must not fall through to sellUpgradePoint. Full policy is L29-08.
    return { score: HEURISTIC_BAND_WEIGHTS.sustain - 8, code: 'sustain' };
  }

  // sellUpgradePoint
  return { score: HEURISTIC_BAND_WEIGHTS.sustain - 20, code: 'sustain' };
}

function scoreSellCard(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'sellCard' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  const instance = findOwnCard(view, action.instanceId);

  if (instance === undefined) {
    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  // Contest / sole defense: never dump Mirror, Shield, Absorber.
  if (
    (instance.cardId === 'mirror' ||
      instance.cardId === 'shield' ||
      instance.cardId === 'absorber') &&
    (ctx.stance === 'contest' || ctx.incomingThreat > 0)
  ) {
    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  const yieldPoints = getCard(instance.cardId)?.sellYield.points ?? 0;
  const fundSpy = needsPointsToPlaySpy(view) && ctx.stance === 'build';
  const fundStrike = needsPointsToPlayReadyStrike(view);
  const fundRegen =
    view.self.lives <= REGEN_SOFT_LIFE &&
    ownsCardId(view, 'regeneration') &&
    view.self.points < 3;

  // Never sell the card we are trying to fund.
  if (fundSpy && instance.cardId === 'spy') {
    return { score: HEURISTIC_BAND_WEIGHTS.sustain - 30, code: 'sustain' };
  }

  if (
    fundStrike &&
    isAttackCardId(instance.cardId) &&
    instance.isUpgraded &&
    attackDamageFor(instance.cardId, true) >= STRIKE_MIN_DAMAGE
  ) {
    return { score: HEURISTIC_BAND_WEIGHTS.sustain - 30, code: 'sustain' };
  }

  if (yieldPoints <= 0) {
    return { score: HEURISTIC_BAND_WEIGHTS.sustain - 20, code: 'sustain' };
  }

  // CBCPXV: never sell attacks while an opponent's Imposition / Points Generator is live —
  // those hits are how counters die (rules §5 / applyDamage).
  if (hasOpponentBurnTarget(view) && isAttackCardId(instance.cardId)) {
    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  // Early build only: sell-to-fund Spy may dump Mirror/Shield; contest already refused above.
  if (fundSpy || fundStrike || fundRegen) {
    const duplicateBonus =
      view.self.hand.filter((card) => card.cardId === instance.cardId).length > 1 ? 5 : 0;
    return {
      score: HEURISTIC_BAND_WEIGHTS.invest + SELL_TO_FUND_BONUS + yieldPoints + duplicateBonus,
      code: 'invest',
    };
  }

  return { score: HEURISTIC_BAND_WEIGHTS.sustain - 20, code: 'sustain' };
}

function scoreMultiAttack(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playMultipleAttacks' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  let damageSum = 0;
  let costSum = 0;
  let allUpgraded = true;
  let burnNeed = 0;

  for (const part of action.attacks) {
    const instance = findOwnCard(view, part.instanceId);

    if (instance === undefined || !isSharedAttackCardId(instance.cardId)) {
      return { score: Number.NEGATIVE_INFINITY, code: 'pressure' };
    }

    if (!instance.isUpgraded) {
      allUpgraded = false;
    }

    damageSum += attackDamageFor(instance.cardId, instance.isUpgraded);
    costSum += getCard(instance.cardId)?.cost.points ?? 0;
    burnNeed = Math.max(burnNeed, maxBurnableCounter(view, part.targetPlayerId));

    const knownLives = knownOpponentLives(view, part.targetPlayerId);

    if (knownLives !== null && damageSum >= knownLives) {
      return { score: HEURISTIC_BAND_WEIGHTS.lethalNow + damageSum, code: 'lethal-now' };
    }
  }

  if (burnNeed > 0) {
    const clears = damageSum >= burnNeed ? 40 : 0;
    return {
      score:
        HEURISTIC_BAND_WEIGHTS.deny +
        BURN_COUNTER_BONUS +
        Math.min(damageSum, burnNeed) * 15 +
        clears,
      code: 'deny',
    };
  }

  if (!allUpgraded || damageSum < STRIKE_MIN_DAMAGE) {
    return { score: HEURISTIC_BAND_WEIGHTS.sustain - 15, code: 'pressure' };
  }

  const topTarget = ctx.threatOrder[0];
  const hitsTop = action.attacks.some((part) => part.targetPlayerId === topTarget) ? 5 : 0;
  return {
    score: HEURISTIC_BAND_WEIGHTS.pressure + (damageSum - costSum) + hitsTop,
    code: 'pressure',
  };
}

function secondaryInvest(
  view: PlayingStateView,
  action: TurnAction,
  ctx: PolicyContext,
): number {
  if (action.type !== 'upgradeCard') {
    return 0;
  }

  const instance = findOwnCard(view, action.instanceId);

  if (instance === undefined || instance.isUpgraded) {
    return 0;
  }

  const contestExtra = ctx.stance === 'contest' ? CONTEST_UPGRADE_EXTRA : 0;
  const { cardId } = instance;

  if (cardId === 'tax') {
    return UPGRADE_TAX_BONUS;
  }

  if (cardId === 'regeneration') {
    return UPGRADE_REGEN_BONUS;
  }

  if (cardId === 'mirror') {
    return UPGRADE_MIRROR_BONUS + contestExtra;
  }

  if (cardId === 'shield') {
    return UPGRADE_SHIELD_BONUS + contestExtra;
  }

  if (cardId === 'absorber') {
    return UPGRADE_ABSORBER_BONUS;
  }

  if (cardId === 'sentence') {
    return UPGRADE_SENTENCE_BONUS + (ctx.stance === 'finish' ? 20 : 0);
  }

  if (isAttackCardId(cardId)) {
    return UPGRADE_ATTACK_BONUS + attackDamageFor(cardId, true) + contestExtra;
  }

  return 15;
}
