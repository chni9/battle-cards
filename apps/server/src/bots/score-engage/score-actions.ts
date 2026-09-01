/**
 * Engage overlay on frozen v4 `scoreActions` — backlog L40-02 / L40-06 / L54-03.
 * New files only; `score-play/` stays untouched (L32-03).
 */

import {
  attackDamageFor,
  getCard,
  isAttackCardId,
  type CardId,
  type CardInstance,
  type PlayingStateView,
} from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import type { Rng } from '../../engine/rng';
import {
  scoreActions as scoreV4Actions,
  type ScoredAction,
} from '../heuristic-policy';
import {
  eligibleMirrorPendingFromView,
  findOwnCard,
  isSpyThiefImmuneSeat,
  ownCards,
} from '../policy-internals';
import { DEFAULT_POLICY_WEIGHTS, type PolicyWeights } from '../policy-weights';
import {
  attackDamageOfAction,
  attackTargetIds,
  isAnswerCardId,
  readEngageTable,
  type EngageTable,
} from './table';

/**
 * Held specials that may justify selling an attack for play points.
 * Designer 2026-08-18 (JAPMZR): Sentence, Mega Attack, Card Absorber.
 * Spy / shop loops are not on this list.
 */
const WIN_SPECIAL_IDS = ['sentence', 'mega-attack', 'card-absorber'] as const;

function isWinSpecialId(cardId: string): boolean {
  return (WIN_SPECIAL_IDS as readonly string[]).includes(cardId);
}

const HOSTILE_COUNTER_IDS = new Set(['imposition', 'poison', 'super-absorber']);

/** Mirror survive bump vs uncancellable incoming — stays below equal-cancel (+40 + dmg). */
const MIRROR_UNCANCELLABLE_BONUS = 55;

function knownOpponentPoints(view: PlayingStateView, opponentId: string): number | null {
  const player = view.players.find((entry) => entry.id === opponentId);
  const spied = player?.spied;

  if (spied === undefined) {
    return null;
  }

  if (spied.points !== undefined) {
    return spied.points;
  }

  return spied.resourcesSnapshot?.points ?? null;
}

function incomingVolleyDamageBySource(view: PlayingStateView): ReadonlyMap<string, number> {
  const totals = new Map<string, Map<number, number>>();

  for (const effect of view.pendingEffects) {
    if (effect.targetPlayerId !== view.you || !isAttackCardId(effect.cardId)) {
      continue;
    }

    const byQueuedAt = totals.get(effect.sourcePlayerId) ?? new Map<number, number>();
    const current = byQueuedAt.get(effect.queuedAt) ?? 0;
    byQueuedAt.set(
      effect.queuedAt,
      current + attackDamageFor(effect.cardId, effect.isUpgraded) * effect.damageMultiplier,
    );
    totals.set(effect.sourcePlayerId, byQueuedAt);
  }

  const latest = new Map<string, number>();

  for (const [sourceId, byQueuedAt] of totals) {
    let maxQueuedAt = -1;
    let damage = 0;

    for (const [queuedAt, amount] of byQueuedAt) {
      if (queuedAt >= maxQueuedAt) {
        maxQueuedAt = queuedAt;
        damage = amount;
      }
    }

    latest.set(sourceId, damage);
  }

  return latest;
}

function maxHeldAttackDamage(view: PlayingStateView): number {
  let max = 0;

  for (const card of ownCards(view)) {
    if (!isAttackCardId(card.cardId)) {
      continue;
    }

    const damage = attackDamageFor(card.cardId, card.isUpgraded);

    if (damage > max) {
      max = damage;
    }
  }

  return max;
}

function hasUncancellableIncoming(view: PlayingStateView): boolean {
  const held = maxHeldAttackDamage(view);

  for (const damage of incomingVolleyDamageBySource(view).values()) {
    if (damage > held) {
      return true;
    }
  }

  return false;
}

function targetHasHostileCounter(view: PlayingStateView, opponentId: string): boolean {
  const player = view.players.find((entry) => entry.id === opponentId);

  if (player === undefined) {
    return false;
  }

  return player.activePersistentEffects.some(
    (effect) => effect.counter !== null && HOSTILE_COUNTER_IDS.has(effect.cardId),
  );
}

function targetHasOnlySelfishCounter(view: PlayingStateView, opponentId: string): boolean {
  const player = view.players.find((entry) => entry.id === opponentId);

  if (player === undefined || targetHasHostileCounter(view, opponentId)) {
    return false;
  }

  return player.activePersistentEffects.some(
    (effect) => effect.counter !== null && effect.cardId === 'points-generator',
  );
}

function pointsGeneratorIsThreat(
  view: PlayingStateView,
  opponentId: string,
  table: EngageTable,
): boolean {
  const livingOpponents = view.players.filter(
    (player) => player.id !== view.you && !player.isEliminated,
  ).length;

  if (livingOpponents <= 1) {
    return true;
  }

  if (table.attackerIds.has(opponentId) || table.finishableIds.has(opponentId)) {
    return true;
  }

  const points = knownOpponentPoints(view, opponentId);
  return points !== null && points >= 10;
}

function volleyDamageToward(
  view: PlayingStateView,
  action: Extract<TurnAction, { type: 'playMultipleAttacks' }>,
  opponentId: string,
): number {
  let total = 0;

  for (const part of action.attacks) {
    if (part.targetPlayerId !== opponentId) {
      continue;
    }

    const instance = findOwnCard(view, part.instanceId);

    if (instance === undefined || !isAttackCardId(instance.cardId)) {
      continue;
    }

    total += attackDamageFor(instance.cardId, instance.isUpgraded);
  }

  return total;
}

function sellYieldPoints(cardId: CardId): number {
  return getCard(cardId)?.sellYield.points ?? 0;
}

function playPointsCost(cardId: CardId): number | undefined {
  return getCard(cardId)?.cost.points;
}

/** True when this sell is the last gap to play a held win special. */
function fundsHeldWinSpecial(
  view: PlayingStateView,
  extraPoints: number,
): boolean {
  const before = view.self.points;
  const after = before + extraPoints;

  for (const card of view.self.specialCards) {
    if (!isWinSpecialId(card.cardId)) {
      continue;
    }

    const cost = playPointsCost(card.cardId);

    if (cost === undefined) {
      continue;
    }

    if (before < cost && after >= cost) {
      return true;
    }
  }

  return false;
}

function copiesOf(view: PlayingStateView, cardId: CardId): number {
  let count = 0;

  for (const card of ownCards(view)) {
    if (card.cardId === cardId) {
      count += 1;
    }
  }

  return count;
}

/**
 * Selling is not a point farm (JAPMZR). Last attack is already refused by
 * the caller. Super/Mega: keep unless duplicates or this sell funds a held
 * win special. Basic/Strong: 1–2 points is not worth the card unless that
 * same win-special gap.
 */
function refuseAttackSell(
  view: PlayingStateView,
  instance: CardInstance,
): boolean {
  const extra = sellYieldPoints(instance.cardId);
  const fundsWin = fundsHeldWinSpecial(view, extra);

  if (
    instance.cardId === 'super-attack' ||
    instance.cardId === 'mega-attack'
  ) {
    if (copiesOf(view, instance.cardId) >= 2) {
      return false;
    }

    return !fundsWin;
  }

  return !fundsWin;
}

function drawScoreOf(
  scored: readonly ScoredAction[],
  weights: PolicyWeights,
): number {
  for (const entry of scored) {
    if (entry.action.type === 'draw') {
      return entry.score;
    }
  }

  return weights.action.bands.sustain;
}

function overlayEntry(
  view: PlayingStateView,
  entry: ScoredAction,
  table: EngageTable,
  scored: readonly ScoredAction[],
  weights: PolicyWeights,
): ScoredAction {
  const { action } = entry;
  const bands = weights.action.bands;
  const hasEngageTarget = table.finishableIds.size > 0 || table.attackerIds.size > 0;

  if (action.type === 'buyUpgradePoint' && table.unusedUpgradePoints > 0) {
    return { action, score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  if (action.type === 'playCard') {
    const instance = findOwnCard(view, action.instanceId);

    if (instance?.cardId === 'spy' && action.targetPlayerId !== undefined) {
      const target = view.players.find((player) => player.id === action.targetPlayerId);
      const shielded =
        target?.activeShield?.isUpgraded === true;

      if (
        target === undefined ||
        isSpyThiefImmuneSeat(view, action.targetPlayerId) ||
        shielded
      ) {
        return { action, score: Number.NEGATIVE_INFINITY, code: 'deny' };
      }

      const isTopThreat =
        table.attackerIds.has(action.targetPlayerId) ||
        table.finishableIds.has(action.targetPlayerId);

      if (!isTopThreat) {
        return { action, score: bands.invest, code: 'deny' };
      }
    }

    if (instance?.cardId === 'reanimation') {
      if (table.finishableIds.size > 0) {
        return entry;
      }

      return {
        action,
        score: Math.max(entry.score, bands.deny + 150),
        code: 'invest',
      };
    }

    if (
      instance?.cardId === 'mirror' &&
      eligibleMirrorPendingFromView(view, instance.isUpgraded).length > 0 &&
      table.incomingAttackDamage > 0 &&
      hasUncancellableIncoming(view)
    ) {
      return {
        action,
        score: bands.survive + MIRROR_UNCANCELLABLE_BONUS + table.incomingAttackDamage,
        code: 'survive',
      };
    }
  }

  if (action.type === 'buyCard' && action.cardId === 'mirror' && table.incomingAttackDamage >= 4) {
    return {
      action,
      score: Math.max(entry.score, bands.invest + 50),
      code: 'invest',
    };
  }

  if (action.type === 'playMultipleAttacks') {
    const incomingBySource = incomingVolleyDamageBySource(view);

    for (const [sourceId, incomingDamage] of incomingBySource) {
      const answer = volleyDamageToward(view, action, sourceId);

      if (incomingDamage > 0 && answer >= incomingDamage) {
        return {
          action,
          score: bands.survive + weights.action.mutualCancelBonus + answer,
          code: 'survive',
        };
      }
    }
  }

  if (action.type === 'buyCard' && isAttackCardId(action.cardId)) {
    // Buy-Basic-to-sell (HWZMWI). Assembling a *big* attack later is still
    // farming; Basic is the shop loop. Super/Mega keep the v4 score.
    if (action.cardId === 'basic-attack') {
      return {
        action,
        score: Math.min(entry.score, drawScoreOf(scored, weights) - 1),
        code: 'invest',
      };
    }
  }

  if (action.type === 'sellCard') {
    const instance = findOwnCard(view, action.instanceId);

    if (instance !== undefined) {
      if (isAttackCardId(instance.cardId)) {
        // Always keep ≥1 attack — even to fund Sentence (JAPMZR).
        if (table.attackInstanceIds.length <= 1 || refuseAttackSell(view, instance)) {
          return { action, score: Number.NEGATIVE_INFINITY, code: 'sustain' };
        }
      }

      if (
        isAnswerCardId(instance.cardId) &&
        (table.incomingAttackDamage > 0 || hasEngageTarget)
      ) {
        return { action, score: Number.NEGATIVE_INFINITY, code: 'survive' };
      }
    }
  }

  const targets = attackTargetIds(view, action);

  if (targets.length > 0) {
    const hitsHostile = targets.some((id) => targetHasHostileCounter(view, id));
    const hitsSelfishOnly = targets.some(
      (id) => targetHasOnlySelfishCounter(view, id) && !pointsGeneratorIsThreat(view, id, table),
    );

    if (hitsHostile) {
      return {
        action,
        score: Math.max(entry.score, bands.deny + weights.action.burnCounterBonus),
        code: 'deny',
      };
    }

    if (hitsSelfishOnly) {
      return {
        action,
        score: Math.min(entry.score, bands.sustain - 15),
        code: 'pressure',
      };
    }

    const hitsFinishable = targets.some((id) => table.finishableIds.has(id));
    const hitsAttacker = targets.some((id) => table.attackerIds.has(id));
    const damage = attackDamageOfAction(view, action);

    if (hitsAttacker) {
      return {
        action,
        score: Math.max(entry.score, bands.pressure + 800 + damage),
        code: 'pressure',
      };
    }

    if (hitsFinishable) {
      return {
        action,
        score: Math.max(entry.score, bands.pressure + 500 + damage),
        code: 'pressure',
      };
    }

    if (hasEngageTarget) {
      return {
        action,
        score: Math.min(entry.score, bands.sustain - 15),
        code: 'pressure',
      };
    }
  }

  return entry;
}

/** Same signature as v4 `scoreActions` so search can inject this scorer (L40-03). */
export function scoreEngageActions(
  view: PlayingStateView,
  actions: readonly TurnAction[],
  rng: Rng,
  weights: PolicyWeights = DEFAULT_POLICY_WEIGHTS,
): readonly ScoredAction[] {
  const scored = scoreV4Actions(view, actions, rng, weights);
  const table = readEngageTable(view);
  return scored.map((entry) => overlayEntry(view, entry, table, scored, weights));
}
