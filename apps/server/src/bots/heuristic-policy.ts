/**
 * View-only heuristic policy — technical spec v3 §4.4, §4.6 (L16-04).
 *
 * `decide` takes no GameState (decision 2). Same view + same rng seed → same action.
 */

import {
  attackDamageFor,
  getCard,
  isAttackCardId,
  type CardId,
  type CardInstance,
  type PlayingStateView,
  type RewardChoice,
} from '@card-battle/shared';

import type { TurnAction } from '../engine/turn/perform-action';
import type { Rng } from '../engine/rng';
import {
  BUY_SPECIAL_POINTS_FLOOR,
  DENY_ABSORBER_MIN_LIVES_LOST,
  HEURISTIC_BAND_WEIGHTS,
  TAX_LIFE_BUFFER,
} from './heuristic-weights';

export interface MirrorPolicyPick {
  pendingEffectId: string;
  newTargetPlayerId: string;
}

interface ScoredAction {
  action: TurnAction;
  score: number;
}

export function decide(
  view: PlayingStateView,
  actions: readonly TurnAction[],
  rng: Rng,
): TurnAction {
  if (actions.length === 0) {
    throw new RangeError('decide received an empty action list');
  }

  const ctx = buildContext(view, rng);
  const scored: ScoredAction[] = actions.map((action) => ({
    action,
    score: scoreAction(view, action, ctx),
  }));

  let best = scored[0]?.score ?? Number.NEGATIVE_INFINITY;

  for (const entry of scored) {
    if (entry.score > best) {
      best = entry.score;
    }
  }

  const top = scored.filter((entry) => entry.score === best).map((entry) => entry.action);
  return rng.pick(top);
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

  return { pendingEffectId: effect.id, newTargetPlayerId: newTarget };
}

export function pickEliminationRewards(
  view: PlayingStateView,
  availableCards: readonly CardInstance[],
  lifeLimit: number,
  rng: Rng,
): [RewardChoice, RewardChoice] {
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

  const second = pickOne(claimed);
  void rng;
  return [first, second];
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

function scoreAction(view: PlayingStateView, action: TurnAction, ctx: PolicyContext): number {
  if (action.type === 'draw') {
    return HEURISTIC_BAND_WEIGHTS.sustain;
  }

  if (action.type === 'playCard') {
    return scorePlayCard(view, action, ctx);
  }

  if (action.type === 'playMultipleAttacks') {
    return scoreMultiAttack(view, action, ctx);
  }

  if (action.type === 'buyUpgradePoint' || action.type === 'upgradeCard') {
    return HEURISTIC_BAND_WEIGHTS.invest + secondaryInvest(view, action);
  }

  if (action.type === 'buyCard') {
    return HEURISTIC_BAND_WEIGHTS.invest + 10;
  }

  if (action.type === 'buySpecialCard') {
    if (view.self.points < BUY_SPECIAL_POINTS_FLOOR) {
      return Number.NEGATIVE_INFINITY;
    }

    return HEURISTIC_BAND_WEIGHTS.invest;
  }

  // sellCard | sellUpgradePoint
  return HEURISTIC_BAND_WEIGHTS.sustain - 20;
}

function scorePlayCard(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playCard' }>,
  ctx: PolicyContext,
): number {
  const instance = findOwnCard(view, action.instanceId);

  if (instance === undefined) {
    return Number.NEGATIVE_INFINITY;
  }

  const { cardId, isUpgraded } = instance;

  // Kamikaze: never base Suicide; upgraded only if estimated elim ≥ 1.
  if (cardId === 'suicide' && view.self.kitId === 'kamikaze') {
    if (!isUpgraded) {
      return Number.NEGATIVE_INFINITY;
    }

    const elims = estimateSuicideElims(view, ctx);

    if (elims < 1) {
      return Number.NEGATIVE_INFINITY;
    }

    return HEURISTIC_BAND_WEIGHTS.lethalNow + elims * 10;
  }

  if (action.targetPlayerId !== undefined && isImmuneTarget(view, action.targetPlayerId, cardId)) {
    return 0;
  }

  // Survive band
  if (view.self.lives <= ctx.incomingThreat) {
    if (cardId === 'mirror') {
      return HEURISTIC_BAND_WEIGHTS.survive + 30;
    }

    if (cardId === 'shield') {
      return HEURISTIC_BAND_WEIGHTS.survive + 20;
    }

    if (cardId === 'regeneration') {
      return HEURISTIC_BAND_WEIGHTS.survive + (action.quantity ?? 0);
    }

    if (cardId === 'cloning') {
      return HEURISTIC_BAND_WEIGHTS.survive + 10;
    }
  }

  // Lethal now — Spy-confirmed lives only
  if (action.targetPlayerId !== undefined && isAttackCardId(cardId)) {
    const knownLives = knownOpponentLives(view, action.targetPlayerId);

    if (knownLives !== null) {
      const damage = attackDamageFor(cardId, isUpgraded);

      if (damage >= knownLives) {
        return HEURISTIC_BAND_WEIGHTS.lethalNow + damage;
      }
    }
  }

  // Deny
  if (cardId === 'absorber' && action.targetPlayerId !== undefined) {
    const lastLoss = ctx.lastAppliedLoss.get(action.targetPlayerId) ?? 0;

    if (lastLoss >= DENY_ABSORBER_MIN_LIVES_LOST) {
      return HEURISTIC_BAND_WEIGHTS.deny + lastLoss;
    }
  }

  if (cardId === 'thief' && action.targetPlayerId !== undefined) {
    const spend = ctx.observedSpend.get(action.targetPlayerId) ?? 0;
    const topSpender = ctx.threatOrder.find((id) => (ctx.observedSpend.get(id) ?? 0) > 0);
    // Prefer highest observed spending
    const maxSpend = Math.max(0, ...[...ctx.observedSpend.values()]);

    if (spend === maxSpend && spend > 0) {
      return HEURISTIC_BAND_WEIGHTS.deny + spend + (topSpender === action.targetPlayerId ? 1 : 0);
    }
  }

  // Pressure
  if (action.targetPlayerId !== undefined && isAttackCardId(cardId)) {
    const damage = attackDamageFor(cardId, isUpgraded);
    const cost = Math.max(1, getCard(cardId)?.cost.points ?? 1);
    const topTarget = ctx.threatOrder[0];
    const onTop = action.targetPlayerId === topTarget ? 5 : 0;
    const shieldPenalty = view.players.find((p) => p.id === action.targetPlayerId)
      ?.activeShield
      ? -2
      : 0;
    return HEURISTIC_BAND_WEIGHTS.pressure + damage / cost + onTop + shieldPenalty;
  }

  // Tax sustain
  if (cardId === 'tax') {
    if (view.self.lives > ctx.incomingThreat + TAX_LIFE_BUFFER) {
      return HEURISTIC_BAND_WEIGHTS.sustain + 5;
    }

    return Number.NEGATIVE_INFINITY;
  }

  // Other self / utility
  if (cardId === 'regeneration') {
    return HEURISTIC_BAND_WEIGHTS.sustain + (action.quantity ?? 0);
  }

  if (cardId === 'shield' || cardId === 'mirror') {
    return HEURISTIC_BAND_WEIGHTS.sustain + 2;
  }

  return HEURISTIC_BAND_WEIGHTS.sustain;
}

function scoreMultiAttack(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playMultipleAttacks' }>,
  ctx: PolicyContext,
): number {
  let damageSum = 0;
  let costSum = 0;

  for (const part of action.attacks) {
    const instance = findOwnCard(view, part.instanceId);

    if (instance === undefined || !isAttackCardId(instance.cardId)) {
      return Number.NEGATIVE_INFINITY;
    }

    damageSum += attackDamageFor(instance.cardId, instance.isUpgraded);
    costSum += getCard(instance.cardId)?.cost.points ?? 0;

    const knownLives = knownOpponentLives(view, part.targetPlayerId);

    if (knownLives !== null && damageSum >= knownLives) {
      return HEURISTIC_BAND_WEIGHTS.lethalNow + damageSum;
    }
  }

  const topTarget = ctx.threatOrder[0];
  const hitsTop = action.attacks.some((part) => part.targetPlayerId === topTarget) ? 5 : 0;
  return HEURISTIC_BAND_WEIGHTS.pressure + (damageSum - costSum) + hitsTop;
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

function effectDamage(cardId: CardId, isUpgraded: boolean, multiplier: number): number {
  if (!isAttackCardId(cardId)) {
    return 0;
  }

  return attackDamageFor(cardId, isUpgraded) * multiplier;
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
