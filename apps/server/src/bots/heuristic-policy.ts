/**
 * View-only heuristic policy — technical spec v3 §4.4, §4.6 (L16-04).
 *
 * `decide` takes no GameState (decision 2). Same view + same rng seed → same action.
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
  type CardId,
  type CardInstance,
  type Player,
  type PlayingStateView,
  type RewardChoice,
} from '@card-battle/shared';

import { isImmuneTo } from '../engine/kits/is-immune-to';
import type { TurnAction } from '../engine/turn/perform-action';
import type { Rng } from '../engine/rng';
import { SPECIAL_CARD_PURCHASE_COST } from '../engine/economy/buy-special-card';
import {
  ABSORBER_MIN_LIVES_VS_REGEN,
  ABSORBER_POINTS_DENY_BONUS,
  ABSORBER_UP_DENY_BONUS,
  BURN_COUNTER_BONUS,
  BUY_SPECIAL_POINTS_FLOOR,
  BUY_UPGRADE_POINT_BONUS,
  CONTEST_UPGRADE_EXTRA,
  DENY_ABSORBER_MIN_LIVES_LOST,
  FINISH_CHIP_BONUS,
  HEURISTIC_BAND_WEIGHTS,
  IMPOSITION_INVEST_BONUS,
  MUTUAL_CANCEL_BONUS,
  POINTS_GENERATOR_INVEST_BONUS,
  PRESSURE_COST_DIVISOR,
  REGEN_SOFT_LIFE,
  SELL_TO_FUND_BONUS,
  SPY_THIEF_DENY_BONUS,
  SPY_TOP_THREAT_BONUS,
  SPY_UNSPIED_BONUS,
  STRIKE_MIN_DAMAGE,
  TAX_INVEST_BONUS,
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

export type HeuristicStance = 'build' | 'contest' | 'finish';

export interface MirrorPolicyPick {
  pendingEffectId: string;
  newTargetPlayerId: string;
  reason: BotDecisionReason;
}

export interface PolicyDecision {
  action: TurnAction;
  reason: BotDecisionReason;
}

interface ScoredAction {
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

  const ctx = buildContext(view, rng);
  const scored: ScoredAction[] = actions.map((action) => {
    const evaluated = scoreAction(view, action, ctx);
    return { action, score: evaluated.score, code: evaluated.code };
  });

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

interface PolicyContext {
  incomingThreat: number;
  threatOrder: readonly string[];
  cumulativeLoss: ReadonlyMap<string, number>;
  /** Public proxy for Absorber: summed applied livesLost on each seat's last complete turn. */
  lastCompleteTurnLoss: ReadonlyMap<string, number>;
  /** Points actively spent on each seat's last complete turn (Absorber+ proxy). */
  lastTurnPointsSpent: ReadonlyMap<string, number>;
  /** Upgrade points spent on each seat's last complete turn (Absorber+ proxy). */
  lastTurnUpgradePointsSpent: ReadonlyMap<string, number>;
  observedSpend: ReadonlyMap<string, number>;
  stance: HeuristicStance;
  /** Contest: keep at least this many points for Mirror/Shield/counter. */
  pointReserve: number;
  rng: Rng;
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
    return { score: HEURISTIC_BAND_WEIGHTS.sustain, code: 'sustain' };
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

function scorePlayCard(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  const instance = findOwnCard(view, action.instanceId);

  if (instance === undefined) {
    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  const { cardId, isUpgraded } = instance;

  const playCostPoints = estimatedPlayPoints(cardId, isUpgraded);

  if (
    playCostPoints > 0 &&
    violatesPointReserve(view, ctx, view.self.points - playCostPoints) &&
    ctx.stance !== 'finish'
  ) {
    // Still allow Survive-band counters below.
    if (
      !(
        (cardId === 'mirror' || cardId === 'shield') &&
        ctx.incomingThreat > 0
      )
    ) {
      return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
    }
  }

  // Kamikaze: never base Suicide; upgraded only if estimated elim ≥ 1.
  if (cardId === 'suicide' && view.self.kitId === 'kamikaze') {
    if (!isUpgraded) {
      return { score: Number.NEGATIVE_INFINITY, code: 'lethal-now' };
    }

    const elims = estimateSuicideElims(view, ctx);

    if (elims < 1) {
      return { score: Number.NEGATIVE_INFINITY, code: 'lethal-now' };
    }

    return { score: HEURISTIC_BAND_WEIGHTS.lethalNow + elims * 10, code: 'lethal-now' };
  }

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
      score: HEURISTIC_BAND_WEIGHTS.lethalNow + opponents * 5,
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

  if (action.targetPlayerId !== undefined && isImmuneTarget(view, action.targetPlayerId, cardId)) {
    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  // Mutual cancel (Lot 19): equal or stronger attack back at the source cancels the weaker.
  if (action.targetPlayerId !== undefined && isAttackCardId(cardId)) {
    const damage = attackDamageFor(cardId, isUpgraded);

    if (hasCancelingIncomingFrom(view, action.targetPlayerId, damage)) {
      return {
        score: HEURISTIC_BAND_WEIGHTS.survive + MUTUAL_CANCEL_BONUS + damage,
        code: 'survive',
      };
    }
  }

  // Spy/Thief counter — same card back at the source cancels both (tech §4.7).
  if (
    (cardId === 'spy' || cardId === 'thief') &&
    action.targetPlayerId !== undefined &&
    hasPendingCardFrom(view, action.targetPlayerId, cardId)
  ) {
    return {
      score: HEURISTIC_BAND_WEIGHTS.survive + MUTUAL_CANCEL_BONUS,
      code: 'survive',
    };
  }

  // Survive band — any pending attack (lean into counters / life buys under fire).
  if (ctx.incomingThreat > 0) {
    if (cardId === 'mirror') {
      return { score: HEURISTIC_BAND_WEIGHTS.survive + 30, code: 'survive' };
    }

    if (cardId === 'shield') {
      return { score: HEURISTIC_BAND_WEIGHTS.survive + 20, code: 'survive' };
    }

    if (cardId === 'regeneration') {
      return {
        score: HEURISTIC_BAND_WEIGHTS.survive + (action.quantity ?? 0),
        code: 'survive',
      };
    }

    if (cardId === 'cloning') {
      return { score: HEURISTIC_BAND_WEIGHTS.survive + 10, code: 'survive' };
    }
  }

  // Lethal now — Spy-confirmed lives only
  if (action.targetPlayerId !== undefined && isAttackCardId(cardId)) {
    const knownLives = knownOpponentLives(view, action.targetPlayerId);

    if (knownLives !== null) {
      const damage = attackDamageFor(cardId, isUpgraded);

      if (damage >= knownLives) {
        return { score: HEURISTIC_BAND_WEIGHTS.lethalNow + damage, code: 'lethal-now' };
      }
    }
  }

  // Deny — Absorber (base: lives; upgraded: UP / points / lives from last complete turn).
  if (cardId === 'absorber' && action.targetPlayerId !== undefined) {
    return scoreAbsorber(view, action.targetPlayerId, isUpgraded, ctx);
  }

  // Burn public counter persistents (Imposition / Points Generator) — any attack damage
  // that reaches lives decrements counters (engine.md). Chip attacks allowed here.
  if (action.targetPlayerId !== undefined && isAttackCardId(cardId)) {
    const need = maxBurnableCounter(view, action.targetPlayerId);

    if (need > 0) {
      const damage = attackDamageFor(cardId, isUpgraded);
      const clears = damage >= need ? 40 : 0;
      return {
        score:
          HEURISTIC_BAND_WEIGHTS.deny +
          BURN_COUNTER_BONUS +
          Math.min(damage, need) * 15 +
          clears,
        code: 'deny',
      };
    }
  }

  // Spy — unlock kit/hand (and upgraded: live tokens) so lethal-now can fire later.
  if (cardId === 'spy' && action.targetPlayerId !== undefined) {
    const target = view.players.find((player) => player.id === action.targetPlayerId);

    if (
      target === undefined ||
      target.isEliminated ||
      target.isYou ||
      isSpyThiefImmuneSeat(view, action.targetPlayerId)
    ) {
      return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
    }

    const already = target.spied;

    if (already !== undefined) {
      // Base Spy already on them: only upgraded Spy still adds live resources.
      if (isUpgraded && already.lives === undefined) {
        return {
          score: HEURISTIC_BAND_WEIGHTS.deny + 25,
          code: 'deny',
        };
      }

      return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
    }

    const onTop = action.targetPlayerId === ctx.threatOrder[0] ? SPY_TOP_THREAT_BONUS : 0;
    return {
      score: HEURISTIC_BAND_WEIGHTS.deny + SPY_UNSPIED_BONUS + onTop,
      code: 'deny',
    };
  }

  if (cardId === 'thief' && action.targetPlayerId !== undefined) {
    if (isSpyThiefImmuneSeat(view, action.targetPlayerId)) {
      return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
    }

    const spend = ctx.observedSpend.get(action.targetPlayerId) ?? 0;
    const topSpender = ctx.threatOrder.find((id) => (ctx.observedSpend.get(id) ?? 0) > 0);
    // Prefer highest observed spending
    const maxSpend = Math.max(0, ...[...ctx.observedSpend.values()]);

    if (spend === maxSpend && spend > 0) {
      return {
        score: HEURISTIC_BAND_WEIGHTS.deny + spend + (topSpender === action.targetPlayerId ? 1 : 0),
        code: 'deny',
      };
    }

    // No spend signal — do not rng-tie with draw.
    return { score: Number.NEGATIVE_INFINITY, code: 'deny' };
  }

  // Cloning without incoming threat: only when Spy shows a richer seat; else below draw.
  if (cardId === 'cloning' && action.targetPlayerId !== undefined && ctx.incomingThreat <= 0) {
    const target = view.players.find((player) => player.id === action.targetPlayerId);
    const spied = target?.spied;

    if (spied?.lives !== undefined && spied.lives > view.self.lives + 2) {
      return {
        score: HEURISTIC_BAND_WEIGHTS.invest + 40 + (isUpgraded ? 15 : 0),
        code: 'invest',
      };
    }

    if (spied?.points !== undefined && spied.points > view.self.points + 5) {
      return {
        score: HEURISTIC_BAND_WEIGHTS.invest + 35 + (isUpgraded ? 15 : 0),
        code: 'invest',
      };
    }

    return {
      score: HEURISTIC_BAND_WEIGHTS.sustain - UNSCORED_PLAY_PENALTY,
      code: 'sustain',
    };
  }

  // Absorber without a target should not reach here; safety below draw.
  if (cardId === 'absorber') {
    return {
      score: HEURISTIC_BAND_WEIGHTS.sustain - UNSCORED_PLAY_PENALTY,
      code: 'sustain',
    };
  }

  // Pressure — finish stance chips Spy-known dying seats; otherwise upgraded strikes only.
  if (action.targetPlayerId !== undefined && isAttackCardId(cardId)) {
    const damage = attackDamageFor(cardId, isUpgraded);
    const playCost = getCard(cardId)?.cost.points ?? 0;

    if (violatesPointReserve(view, ctx, view.self.points - playCost)) {
      return { score: Number.NEGATIVE_INFINITY, code: 'pressure' };
    }

    const knownLives = knownOpponentLives(view, action.targetPlayerId);
    const canFinishKnown =
      knownLives !== null && knownLives > 0 && damage >= knownLives && playCost <= view.self.points;

    if (ctx.stance === 'finish' && canFinishKnown) {
      const onWeakest =
        action.targetPlayerId === weakestDyingSeat(view, bestAffordableStrikeDamage(view))
          ? 15
          : 0;
      return {
        score: HEURISTIC_BAND_WEIGHTS.pressure + FINISH_CHIP_BONUS + damage + onWeakest,
        code: 'pressure',
      };
    }

    if (!isUpgraded || damage < STRIKE_MIN_DAMAGE) {
      return {
        score: HEURISTIC_BAND_WEIGHTS.sustain - 15,
        code: 'pressure',
      };
    }

    const cost = Math.max(1, playCost || 1);
    const topTarget = ctx.threatOrder[0];
    const onTop = action.targetPlayerId === topTarget ? 5 : 0;
    const retaliateBonus = hasAnyIncomingFrom(view, action.targetPlayerId) ? 8 : 0;
    const knownFinishBonus =
      knownLives !== null && knownLives <= damage + 2 ? 20 : knownLives !== null ? 8 : 0;
    const shieldPenalty = view.players.find((p) => p.id === action.targetPlayerId)
      ?.activeShield
      ? -2
      : 0;
    return {
      score:
        HEURISTIC_BAND_WEIGHTS.pressure +
        damage -
        cost / PRESSURE_COST_DIVISOR +
        onTop +
        retaliateBonus +
        knownFinishBonus +
        shieldPenalty,
      code: 'pressure',
    };
  }

  // Tax — farm engine; prefer upgraded; refuse when reserve would break after other spends only.
  if (cardId === 'tax') {
    if (view.self.lives > ctx.incomingThreat + TAX_LIFE_BUFFER) {
      const upgradeBias = isUpgraded ? 25 : 0;
      // In contest, still Tax but below defense upgrades / Mirror.
      const contestPenalty = ctx.stance === 'contest' ? -15 : 0;
      const finishPenalty = ctx.stance === 'finish' ? -40 : 0;
      return {
        score:
          HEURISTIC_BAND_WEIGHTS.invest +
          TAX_INVEST_BONUS +
          upgradeBias +
          contestPenalty +
          finishPenalty,
        code: 'invest',
      };
    }

    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  // Other self / utility
  if (cardId === 'regeneration') {
    // Soft top-up when lives are low (Imposition drip / post-Tax floor) — ONMMBZ bots
    // drew to death with Regen in hand.
    if (view.self.lives <= REGEN_SOFT_LIFE || (isUpgraded && view.self.lives <= REGEN_SOFT_LIFE + 2)) {
      return {
        score:
          HEURISTIC_BAND_WEIGHTS.invest +
          50 +
          (action.quantity ?? 0) +
          (isUpgraded ? 20 : 0),
        code: 'invest',
      };
    }

    return {
      score: HEURISTIC_BAND_WEIGHTS.sustain + (action.quantity ?? 0) + (isUpgraded ? 5 : 0),
      code: 'sustain',
    };
  }

  if (cardId === 'shield' || cardId === 'mirror') {
    const contestBias = ctx.stance === 'contest' ? 40 : 0;
    return {
      score: HEURISTIC_BAND_WEIGHTS.sustain + 2 + contestBias + (isUpgraded ? 10 : 0),
      code: 'sustain',
    };
  }

  // Never rng-tie with draw for an unscored playCard.
  return {
    score: HEURISTIC_BAND_WEIGHTS.sustain - UNSCORED_PLAY_PENALTY,
    code: 'sustain',
  };
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

function findOwnCard(
  view: PlayingStateView,
  instanceId: string,
): CardInstance | undefined {
  return (
    view.self.hand.find((card) => card.instanceId === instanceId) ??
    view.self.specialCards.find((card) => card.instanceId === instanceId)
  );
}

function hasOwnPersistent(view: PlayingStateView, cardId: CardId): boolean {
  return view.self.activePersistentEffects.some((effect) => effect.cardId === cardId);
}

function ownsCardId(view: PlayingStateView, cardId: CardId): boolean {
  return (
    view.self.hand.some((card) => card.cardId === cardId) ||
    view.self.specialCards.some((card) => card.cardId === cardId)
  );
}

function spyPlayCost(): number {
  return getCard('spy')?.cost.points ?? 4;
}

function hasSpyableUnspiedOpponent(view: PlayingStateView): boolean {
  return view.players.some(
    (player) =>
      player.id !== view.you &&
      !player.isEliminated &&
      player.spied === undefined &&
      !isSpyThiefImmuneSeat(view, player.id),
  );
}

function needsPointsToPlaySpy(view: PlayingStateView): boolean {
  if (!ownsCardId(view, 'spy') || !hasSpyableUnspiedOpponent(view)) {
    return false;
  }

  return view.self.points < spyPlayCost();
}

function needsPointsToPlayReadyStrike(view: PlayingStateView): boolean {
  for (const card of view.self.hand) {
    if (!isAttackCardId(card.cardId) || !card.isUpgraded) {
      continue;
    }

    const damage = attackDamageFor(card.cardId, true);

    if (damage < STRIKE_MIN_DAMAGE) {
      continue;
    }

    const cost = getCard(card.cardId)?.cost.points ?? 0;

    if (view.self.points < cost) {
      return true;
    }
  }

  return false;
}

/** Highest remaining counter among an opponent's public persistents (Imposition = 2, etc.). */
function maxBurnableCounter(view: PlayingStateView, opponentId: string): number {
  const player = view.players.find((entry) => entry.id === opponentId);

  if (player === undefined || player.isEliminated) {
    return 0;
  }

  let max = 0;

  for (const effect of player.activePersistentEffects) {
    if (effect.counter !== null && effect.counter > max) {
      max = effect.counter;
    }
  }

  return max;
}

function hasOpponentBurnTarget(view: PlayingStateView): boolean {
  return view.players.some(
    (player) =>
      player.id !== view.you &&
      !player.isEliminated &&
      maxBurnableCounter(view, player.id) > 0,
  );
}

function isSpyThiefImmuneSeat(view: PlayingStateView, targetId: string): boolean {
  if (isImmuneTarget(view, targetId, 'spy')) {
    return true;
  }

  // Learn Untouchable from a public immune resolve (ONMMBZ: Spy on human → immune).
  return view.actionLog.some(
    (entry) =>
      entry.kind === 'actionResolved' &&
      entry.outcome === 'immune' &&
      entry.targetPlayerId === targetId &&
      (entry.cardId === 'spy' || entry.cardId === 'thief' || entry.cardId === 'spy-thief'),
  );
}

function effectDamage(cardId: CardId, isUpgraded: boolean, multiplier: number): number {
  if (!isAttackCardId(cardId)) {
    return 0;
  }

  return attackDamageFor(cardId, isUpgraded) * multiplier;
}

/** Pending attack from `sourceId` we can cancel (equal or weaker than our riposte). */
function hasCancelingIncomingFrom(
  view: PlayingStateView,
  sourceId: string,
  damage: number,
): boolean {
  return view.pendingEffects.some((effect) => {
    if (
      effect.targetPlayerId !== view.you ||
      effect.sourcePlayerId !== sourceId ||
      !isAttackCardId(effect.cardId)
    ) {
      return false;
    }

    return effectDamage(effect.cardId, effect.isUpgraded, effect.damageMultiplier) <= damage;
  });
}

function hasAnyIncomingFrom(view: PlayingStateView, sourceId: string): boolean {
  return view.pendingEffects.some(
    (effect) =>
      effect.targetPlayerId === view.you &&
      effect.sourcePlayerId === sourceId &&
      isAttackCardId(effect.cardId),
  );
}

function hasPendingCardFrom(
  view: PlayingStateView,
  sourceId: string,
  cardId: CardId,
): boolean {
  return view.pendingEffects.some(
    (effect) =>
      effect.targetPlayerId === view.you &&
      effect.sourcePlayerId === sourceId &&
      effect.cardId === cardId,
  );
}

function knownOpponentLives(view: PlayingStateView, opponentId: string): number | null {
  const player = view.players.find((entry) => entry.id === opponentId);
  const spied = player?.spied;

  if (spied?.lives !== undefined) {
    return spied.lives;
  }

  // Base Spy snapshot is not live — do not treat as lethal-now certainty.
  return null;
}

function isImmuneTarget(view: PlayingStateView, targetId: string, cardId: CardId): boolean {
  const kitId = view.players.find((player) => player.id === targetId)?.spied?.kitId;

  if (kitId === undefined) {
    return false;
  }

  // `isImmuneTo` only reads `kitId` — traits come from the catalog.
  return isImmuneTo({ kitId } as Player, cardId);
}

function estimateSuicideElims(view: PlayingStateView, ctx: PolicyContext): number {
  // Upgraded Suicide deals 5 life loss to each opponent (rules) — approximate with proxy.
  const SUICIDE_LOSS = 5;
  let elims = 0;

  for (const opponent of view.players) {
    if (opponent.id === view.you || opponent.isEliminated) {
      continue;
    }

    const known = knownOpponentLives(view, opponent.id);

    if (known !== null && known <= SUICIDE_LOSS) {
      elims += 1;
      continue;
    }

    // Proxy: high cumulative loss suggests low remaining lives.
    const lost = ctx.cumulativeLoss.get(opponent.id) ?? 0;

    if (lost >= 8) {
      elims += 1;
    }
  }

  return elims;
}

function rankThreatOpponents(view: PlayingStateView, rng: Rng): string[] {
  const living = view.players.filter(
    (player) => player.id !== view.you && !player.isEliminated,
  );
  const loss = sumLivesLostByTarget(view);

  const decorated = living.map((player) => {
    const cardsKnown =
      player.spied !== undefined
        ? player.spied.hand.length + player.spied.specialCards.length
        : Number.POSITIVE_INFINITY;
    return {
      id: player.id,
      loss: loss.get(player.id) ?? 0,
      cardsKnown,
      tie: rng.nextInt(1_000_000),
    };
  });

  decorated.sort((left, right) => {
    if (right.loss !== left.loss) {
      return right.loss - left.loss;
    }

    if (left.cardsKnown !== right.cardsKnown) {
      return left.cardsKnown - right.cardsKnown;
    }

    return left.tie - right.tie;
  });

  return decorated.map((entry) => entry.id);
}

function ownCards(view: PlayingStateView): readonly CardInstance[] {
  return [...view.self.hand, ...view.self.specialCards];
}

function isSetupReady(view: PlayingStateView): boolean {
  const cards = ownCards(view);
  const taxHeld = cards.filter((card) => card.cardId === 'tax');

  if (taxHeld.length > 0 && taxHeld.some((card) => !card.isUpgraded)) {
    return false;
  }

  const regenHeld = cards.filter((card) => card.cardId === 'regeneration');

  if (regenHeld.length > 0 && regenHeld.some((card) => !card.isUpgraded)) {
    return false;
  }

  return cards.some(
    (card) =>
      card.isUpgraded &&
      (isAttackCardId(card.cardId) ||
        card.cardId === 'sentence' ||
        card.cardId === 'mirror' ||
        card.cardId === 'shield'),
  );
}

function bestAffordableStrikeDamage(view: PlayingStateView): number {
  let best = 0;

  for (const card of view.self.hand) {
    if (!isAttackCardId(card.cardId)) {
      continue;
    }

    const cost = getCard(card.cardId)?.cost.points ?? 0;

    if (cost > view.self.points) {
      continue;
    }

    best = Math.max(best, attackDamageFor(card.cardId, card.isUpgraded));
  }

  return best;
}

function hasSentencePlus(view: PlayingStateView): boolean {
  return view.self.specialCards.some(
    (card) => card.cardId === 'sentence' && card.isUpgraded,
  );
}

function weakestDyingSeat(view: PlayingStateView, strikeDamage: number): string | null {
  let bestId: string | null = null;
  let bestLives = Number.POSITIVE_INFINITY;

  for (const player of view.players) {
    if (player.id === view.you || player.isEliminated) {
      continue;
    }

    const lives = player.spied?.lives;

    if (lives === undefined || lives <= 0 || lives > strikeDamage) {
      continue;
    }

    if (lives < bestLives) {
      bestLives = lives;
      bestId = player.id;
    }
  }

  return bestId;
}

function hasDyingOpponent(view: PlayingStateView): boolean {
  const strike = bestAffordableStrikeDamage(view);

  if (weakestDyingSeat(view, strike) !== null) {
    return true;
  }

  if (hasSentencePlus(view)) {
    return view.players.some((player) => player.id !== view.you && !player.isEliminated);
  }

  return false;
}

function hasLethalAvailable(view: PlayingStateView): boolean {
  const strike = bestAffordableStrikeDamage(view);

  for (const player of view.players) {
    if (player.id === view.you || player.isEliminated) {
      continue;
    }

    const lives = player.spied?.lives;

    if (lives !== undefined && lives > 0 && strike >= lives) {
      return true;
    }
  }

  return hasSentencePlus(view);
}

function hasContestThreat(view: PlayingStateView, incomingThreat: number): boolean {
  if (
    incomingThreat > 0 &&
    view.pendingEffects.some(
      (effect) =>
        effect.targetPlayerId === view.you &&
        effect.isUpgraded &&
        isAttackCardId(effect.cardId),
    )
  ) {
    return true;
  }

  for (const entry of view.actionLog) {
    if (entry.kind !== 'actionPlayed' || entry.actorPlayerId === view.you) {
      continue;
    }

    if (
      (entry.action === 'upgradeCard' || entry.action === 'playCard') &&
      (entry.cardId === 'super-attack' || entry.cardId === 'strong-attack') &&
      (entry.action === 'upgradeCard' || entry.isUpgraded === true)
    ) {
      return true;
    }
  }

  for (const player of view.players) {
    if (player.id === view.you || player.isEliminated || player.spied === undefined) {
      continue;
    }

    if (player.spied.lives !== undefined && player.spied.lives > view.self.lives + 3) {
      return true;
    }

    if (player.spied.points !== undefined && player.spied.points > view.self.points + 10) {
      return true;
    }
  }

  return false;
}

function deriveStance(view: PlayingStateView, incomingThreat: number): HeuristicStance {
  if (hasLethalAvailable(view) || hasDyingOpponent(view)) {
    return 'finish';
  }

  if (isSetupReady(view) && hasContestThreat(view, incomingThreat)) {
    return 'contest';
  }

  return 'build';
}

function computePointReserve(view: PlayingStateView): number {
  let reserve = 0;
  const cards = ownCards(view);

  if (cards.some((card) => card.cardId === 'mirror')) {
    reserve = Math.max(reserve, getCard('mirror')?.cost.points ?? 6);
  }

  if (cards.some((card) => card.cardId === 'shield')) {
    reserve = Math.max(reserve, getCard('shield')?.cost.points ?? 7);
  }

  for (const card of cards) {
    if (!isAttackCardId(card.cardId) || !card.isUpgraded) {
      continue;
    }

    if (attackDamageFor(card.cardId, true) >= STRIKE_MIN_DAMAGE) {
      reserve = Math.max(reserve, getCard(card.cardId)?.cost.points ?? 0);
    }
  }

  return reserve;
}

function violatesPointReserve(
  _view: PlayingStateView,
  ctx: PolicyContext,
  pointsAfter: number,
): boolean {
  if (ctx.stance === 'finish' || ctx.pointReserve <= 0) {
    return false;
  }

  return pointsAfter < ctx.pointReserve;
}

function scoreAbsorber(
  view: PlayingStateView,
  targetPlayerId: string,
  isUpgraded: boolean,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  const lastLoss = ctx.lastCompleteTurnLoss.get(targetPlayerId) ?? 0;
  const pointsSpent = ctx.lastTurnPointsSpent.get(targetPlayerId) ?? 0;
  const upgradeSpent = ctx.lastTurnUpgradePointsSpent.get(targetPlayerId) ?? 0;
  const absorberCost = getCard('absorber')?.cost.points ?? 3;
  const kitDraw = getKit(view.self.kitId).startingResources.draw;
  const hasRegen = ownsCardId(view, 'regeneration');

  if (isUpgraded && upgradeSpent > 0) {
    // Below lethal-now (10_000); above normal Invest/Tax.
    return {
      score: HEURISTIC_BAND_WEIGHTS.deny + ABSORBER_UP_DENY_BONUS + upgradeSpent * 10,
      code: 'deny',
    };
  }

  if (isUpgraded && pointsSpent > absorberCost + kitDraw) {
    return {
      score: HEURISTIC_BAND_WEIGHTS.deny + ABSORBER_POINTS_DENY_BONUS + pointsSpent,
      code: 'deny',
    };
  }

  const usefulLives =
    lastLoss >= ABSORBER_MIN_LIVES_VS_REGEN ||
    lastLoss >= DENY_ABSORBER_MIN_LIVES_LOST ||
    (lastLoss >= 1 && !hasRegen && view.self.lives <= REGEN_SOFT_LIFE);

  if (usefulLives) {
    return {
      score: HEURISTIC_BAND_WEIGHTS.deny + lastLoss + (isUpgraded ? 5 : 0),
      code: 'deny',
    };
  }

  return {
    score: HEURISTIC_BAND_WEIGHTS.sustain - UNSCORED_PLAY_PENALTY,
    code: 'sustain',
  };
}

function estimatedPlayPoints(cardId: CardId, isUpgraded: boolean): number {
  const card = getCard(cardId);

  if (card === undefined) {
    return 0;
  }

  const { cost } = card;

  if ('points' in cost && typeof cost.points === 'number') {
    return cost.points;
  }

  if ('pointsPerLife' in cost && typeof cost.pointsPerLife === 'number') {
    return isUpgraded ? 2 : cost.pointsPerLife;
  }

  return 0;
}

/**
 * Public Absorber proxy for points / upgrade points spent on each seat's last complete turn.
 */
function lastCompleteTurnSpendByActor(view: PlayingStateView): {
  points: Map<string, number>;
  upgradePoints: Map<string, number>;
} {
  const lastCompleteTurnSeq = new Map<string, number>();

  for (const entry of view.actionLog) {
    if (entry.kind !== 'actionPlayed') {
      continue;
    }

    if (
      entry.actorPlayerId === view.currentTurnPlayerId &&
      entry.turnSequence === view.turnSequence
    ) {
      continue;
    }

    const previous = lastCompleteTurnSeq.get(entry.actorPlayerId) ?? -1;

    if (entry.turnSequence > previous) {
      lastCompleteTurnSeq.set(entry.actorPlayerId, entry.turnSequence);
    }
  }

  const points = new Map<string, number>();
  const upgradePoints = new Map<string, number>();

  for (const [playerId, turnSeq] of lastCompleteTurnSeq) {
    let spentPoints = 0;
    let spentUp = 0;

    for (const entry of view.actionLog) {
      if (
        entry.kind !== 'actionPlayed' ||
        entry.actorPlayerId !== playerId ||
        entry.turnSequence !== turnSeq
      ) {
        continue;
      }

      if (entry.action === 'upgradeCard') {
        spentUp += 1;
        continue;
      }

      if (entry.action === 'buyUpgradePoint') {
        spentPoints += UPGRADE_POINT_ECONOMY.buyCostPoints;
        continue;
      }

      if (entry.action === 'buySpecialCard') {
        spentPoints += SPECIAL_CARD_PURCHASE_COST;
        continue;
      }

      if (entry.action === 'buyCard' && entry.cardId !== undefined) {
        spentPoints += getCard(entry.cardId)?.buyCost.points ?? 0;
        continue;
      }

      if (entry.action === 'playCard' && entry.cardId !== undefined) {
        spentPoints += estimatedPlayPoints(entry.cardId, entry.isUpgraded === true);
        continue;
      }

      if (entry.action === 'playMultipleAttacks' && entry.attacks !== undefined) {
        for (const part of entry.attacks) {
          spentPoints += estimatedPlayPoints(part.cardId, part.isUpgraded);
        }
      }
    }

    points.set(playerId, spentPoints);
    upgradePoints.set(playerId, spentUp);
  }

  return { points, upgradePoints };
}

function sumLivesLostByTarget(view: PlayingStateView): Map<string, number> {
  const map = new Map<string, number>();

  for (const entry of view.actionLog) {
    if (entry.kind !== 'actionResolved' || entry.outcome !== 'applied') {
      continue;
    }

    map.set(entry.targetPlayerId, (map.get(entry.targetPlayerId) ?? 0) + entry.livesLost);
  }

  return map;
}

/**
 * Public Absorber proxy for `TurnLedger.livesLost` on each seat's last complete turn.
 *
 * Resolutions land on the target's turn (`turnSequence` matches their `actionPlayed`).
 * Using the global last resolution per target was wrong: an old big hit stayed forever
 * when later turns had no `actionResolved` on them — bots Absorbed for 0 ledger gain.
 */
function lastCompleteTurnLivesLostByTarget(view: PlayingStateView): Map<string, number> {
  const lastCompleteTurnSeq = new Map<string, number>();

  for (const entry of view.actionLog) {
    if (entry.kind !== 'actionPlayed') {
      continue;
    }

    // In-progress turn is not complete — ledger still accumulating / will reset next.
    if (
      entry.actorPlayerId === view.currentTurnPlayerId &&
      entry.turnSequence === view.turnSequence
    ) {
      continue;
    }

    const previous = lastCompleteTurnSeq.get(entry.actorPlayerId) ?? -1;

    if (entry.turnSequence > previous) {
      lastCompleteTurnSeq.set(entry.actorPlayerId, entry.turnSequence);
    }
  }

  const map = new Map<string, number>();

  for (const [playerId, turnSeq] of lastCompleteTurnSeq) {
    let lost = 0;

    for (const entry of view.actionLog) {
      if (
        entry.kind !== 'actionResolved' ||
        entry.outcome !== 'applied' ||
        entry.targetPlayerId !== playerId ||
        entry.turnSequence !== turnSeq
      ) {
        continue;
      }

      lost += entry.livesLost;
    }

    map.set(playerId, lost);
  }

  return map;
}

function sumPointsSpentByActor(view: PlayingStateView): Map<string, number> {
  // Public log has no direct pointsSpent; approximate via play costs of actionPlayed.
  const map = new Map<string, number>();

  for (const entry of view.actionLog) {
    if (entry.kind !== 'actionPlayed') {
      continue;
    }

    if (entry.action === 'playCard' && entry.cardId !== undefined) {
      const cost = getCard(entry.cardId)?.cost.points ?? 0;
      map.set(entry.actorPlayerId, (map.get(entry.actorPlayerId) ?? 0) + cost);
    }

    if (entry.action === 'buyCard' || entry.action === 'buySpecialCard') {
      map.set(entry.actorPlayerId, (map.get(entry.actorPlayerId) ?? 0) + 10);
    }
  }

  return map;
}
