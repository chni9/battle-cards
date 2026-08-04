/**
 * View-only heuristic policy — technical spec v3 §4.4, §4.6 (L16-04).
 *
 * `decide` takes no GameState (decision 2). Same view + same rng seed → same action.
 */

import {
  attackDamageFor,
  getCard,
  isAttackCardId,
  type BotDecisionReason,
  type BotReasonCode,
  type CardId,
  type CardInstance,
  type PlayingStateView,
  type RewardChoice,
} from '@card-battle/shared';

import type { TurnAction } from '../engine/turn/perform-action';
import type { Rng } from '../engine/rng';
import {
  BUY_SPECIAL_POINTS_FLOOR,
  BUY_UPGRADE_POINT_BONUS,
  DENY_ABSORBER_MIN_LIVES_LOST,
  HEURISTIC_BAND_WEIGHTS,
  MUTUAL_CANCEL_BONUS,
  PRESSURE_COST_DIVISOR,
  SPY_TOP_THREAT_BONUS,
  SPY_UNSPIED_BONUS,
  STRIKE_MIN_DAMAGE,
  TAX_INVEST_BONUS,
  TAX_LIFE_BUFFER,
  UPGRADE_ATTACK_BONUS,
} from './heuristic-weights';

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
): MirrorPolicyPick | null {
  const incoming = view.pendingEffects.filter(
    (effect) => effect.targetPlayerId === view.you && isAttackCardId(effect.cardId),
  );

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

  const targets = rankThreatOpponents(view, rng).filter((id) => id !== effect.sourcePlayerId);
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
  lastAppliedLoss: ReadonlyMap<string, number>;
  observedSpend: ReadonlyMap<string, number>;
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

  return {
    incomingThreat,
    threatOrder: rankThreatOpponents(view, rng),
    cumulativeLoss: sumLivesLostByTarget(view),
    lastAppliedLoss: lastLivesLostByTarget(view),
    observedSpend: sumPointsSpentByActor(view),
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
    const bonus =
      action.type === 'buyUpgradePoint'
        ? BUY_UPGRADE_POINT_BONUS
        : (() => {
            const secondary = secondaryInvest(view, action);
            return secondary > 0 ? UPGRADE_ATTACK_BONUS + secondary : secondary;
          })();

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
      ctx.incomingThreat > 0
    ) {
      return { score: HEURISTIC_BAND_WEIGHTS.invest + 30, code: 'invest' };
    }

    // Economy / kill tools / intel before filler shop buys.
    if (action.cardId === 'tax') {
      return { score: HEURISTIC_BAND_WEIGHTS.invest + 35, code: 'invest' };
    }

    if (action.cardId === 'spy' && hasUnspiedLivingOpponent(view)) {
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

    return { score: HEURISTIC_BAND_WEIGHTS.invest, code: 'invest' };
  }

  // sellCard | sellUpgradePoint
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

  if (action.targetPlayerId !== undefined && isImmuneTarget(view, action.targetPlayerId, cardId)) {
    return { score: 0, code: 'sustain' };
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

  // Deny
  if (cardId === 'absorber' && action.targetPlayerId !== undefined) {
    const lastLoss = ctx.lastAppliedLoss.get(action.targetPlayerId) ?? 0;

    if (lastLoss >= DENY_ABSORBER_MIN_LIVES_LOST) {
      return { score: HEURISTIC_BAND_WEIGHTS.deny + lastLoss, code: 'deny' };
    }
  }

  // Spy — unlock kit/hand (and upgraded: live tokens) so lethal-now can fire later.
  if (cardId === 'spy' && action.targetPlayerId !== undefined) {
    const target = view.players.find((player) => player.id === action.targetPlayerId);

    if (target === undefined || target.isEliminated || target.isYou) {
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
  }

  // Pressure — only upgraded, high-damage strikes. Chip / base attacks stay below Invest.
  // Prefer finishing a Spy-known low-life seat when the strike is ready.
  if (action.targetPlayerId !== undefined && isAttackCardId(cardId)) {
    const damage = attackDamageFor(cardId, isUpgraded);

    if (!isUpgraded || damage < STRIKE_MIN_DAMAGE) {
      return {
        score: HEURISTIC_BAND_WEIGHTS.sustain - 15,
        code: 'pressure',
      };
    }

    const cost = Math.max(1, getCard(cardId)?.cost.points ?? 1);
    const topTarget = ctx.threatOrder[0];
    const onTop = action.targetPlayerId === topTarget ? 5 : 0;
    const retaliateBonus = hasAnyIncomingFrom(view, action.targetPlayerId) ? 8 : 0;
    const knownLives = knownOpponentLives(view, action.targetPlayerId);
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

  // Tax — primary point engine (Invest), not a last-resort sustain play.
  if (cardId === 'tax') {
    if (view.self.lives > ctx.incomingThreat + TAX_LIFE_BUFFER) {
      return { score: HEURISTIC_BAND_WEIGHTS.invest + TAX_INVEST_BONUS, code: 'invest' };
    }

    return { score: Number.NEGATIVE_INFINITY, code: 'sustain' };
  }

  // Other self / utility
  if (cardId === 'regeneration') {
    return {
      score: HEURISTIC_BAND_WEIGHTS.sustain + (action.quantity ?? 0),
      code: 'sustain',
    };
  }

  if (cardId === 'shield' || cardId === 'mirror') {
    return { score: HEURISTIC_BAND_WEIGHTS.sustain + 2, code: 'sustain' };
  }

  return { score: HEURISTIC_BAND_WEIGHTS.sustain, code: 'sustain' };
}

function scoreMultiAttack(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playMultipleAttacks' }>,
  ctx: PolicyContext,
): { score: number; code: BotReasonCode } {
  let damageSum = 0;
  let costSum = 0;
  let allUpgraded = true;

  for (const part of action.attacks) {
    const instance = findOwnCard(view, part.instanceId);

    if (instance === undefined || !isAttackCardId(instance.cardId)) {
      return { score: Number.NEGATIVE_INFINITY, code: 'pressure' };
    }

    if (!instance.isUpgraded) {
      allUpgraded = false;
    }

    damageSum += attackDamageFor(instance.cardId, instance.isUpgraded);
    costSum += getCard(instance.cardId)?.cost.points ?? 0;

    const knownLives = knownOpponentLives(view, part.targetPlayerId);

    if (knownLives !== null && damageSum >= knownLives) {
      return { score: HEURISTIC_BAND_WEIGHTS.lethalNow + damageSum, code: 'lethal-now' };
    }
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
): number {
  if (action.type === 'upgradeCard') {
    const instance = findOwnCard(view, action.instanceId);

    if (instance !== undefined && isAttackCardId(instance.cardId)) {
      return attackDamageFor(instance.cardId, true);
    }
  }

  return 0;
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

function ownsCardId(view: PlayingStateView, cardId: CardId): boolean {
  return (
    view.self.hand.some((card) => card.cardId === cardId) ||
    view.self.specialCards.some((card) => card.cardId === cardId)
  );
}

function hasUnspiedLivingOpponent(view: PlayingStateView): boolean {
  return view.players.some(
    (player) =>
      player.id !== view.you && !player.isEliminated && player.spied === undefined,
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
  if (cardId !== 'thief' && cardId !== 'spy') {
    return false;
  }

  const kitId = view.players.find((player) => player.id === targetId)?.spied?.kitId;
  return kitId === 'untouchable';
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

function lastLivesLostByTarget(view: PlayingStateView): Map<string, number> {
  const map = new Map<string, number>();

  for (const entry of view.actionLog) {
    if (entry.kind !== 'actionResolved' || entry.outcome !== 'applied') {
      continue;
    }

    map.set(entry.targetPlayerId, entry.livesLost);
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
