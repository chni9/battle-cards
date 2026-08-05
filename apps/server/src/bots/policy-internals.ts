/**
 * Shared heuristic-policy internals — technical spec v3 §4.4, §4.6 (L16-04).
 *
 * Extracted from `heuristic-policy.ts` in L29-01 so `score-play/score-core.ts` and
 * `heuristic-policy.ts` can both reach these helpers without an import cycle between
 * the two. Pure refactor — no behaviour change, bodies are unchanged.
 */

import {
  attackDamageFor,
  getCard,
  getKit,
  isAttackCardId,
  UPGRADE_POINT_ECONOMY,
  type BotReasonCode,
  type CardId,
  type CardInstance,
  type Player,
  type PlayingStateView,
} from '@card-battle/shared';

import { isImmuneTo } from '../engine/kits/is-immune-to';
import type { Rng } from '../engine/rng';
import { SPECIAL_CARD_PURCHASE_COST } from '../engine/economy/buy-special-card';
import {
  ABSORBER_MIN_LIVES_VS_REGEN,
  ABSORBER_POINTS_DENY_BONUS,
  ABSORBER_UP_DENY_BONUS,
  DENY_ABSORBER_MIN_LIVES_LOST,
  HEURISTIC_BAND_WEIGHTS,
  REGEN_SOFT_LIFE,
  STRIKE_MIN_DAMAGE,
  UNSCORED_PLAY_PENALTY,
} from './heuristic-weights';

export type HeuristicStance = 'build' | 'contest' | 'finish';

export interface PolicyContext {
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

export function findOwnCard(
  view: PlayingStateView,
  instanceId: string,
): CardInstance | undefined {
  return (
    view.self.hand.find((card) => card.instanceId === instanceId) ??
    view.self.specialCards.find((card) => card.instanceId === instanceId)
  );
}

export function hasOwnPersistent(view: PlayingStateView, cardId: CardId): boolean {
  return view.self.activePersistentEffects.some((effect) => effect.cardId === cardId);
}

export function ownsCardId(view: PlayingStateView, cardId: CardId): boolean {
  return (
    view.self.hand.some((card) => card.cardId === cardId) ||
    view.self.specialCards.some((card) => card.cardId === cardId)
  );
}

export function spyPlayCost(): number {
  return getCard('spy')?.cost.points ?? 4;
}

export function hasSpyableUnspiedOpponent(view: PlayingStateView): boolean {
  return view.players.some(
    (player) =>
      player.id !== view.you &&
      !player.isEliminated &&
      player.spied === undefined &&
      !isSpyThiefImmuneSeat(view, player.id),
  );
}

export function needsPointsToPlaySpy(view: PlayingStateView): boolean {
  if (!ownsCardId(view, 'spy') || !hasSpyableUnspiedOpponent(view)) {
    return false;
  }

  return view.self.points < spyPlayCost();
}

export function needsPointsToPlayReadyStrike(view: PlayingStateView): boolean {
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
export function maxBurnableCounter(view: PlayingStateView, opponentId: string): number {
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

export function hasOpponentBurnTarget(view: PlayingStateView): boolean {
  return view.players.some(
    (player) =>
      player.id !== view.you &&
      !player.isEliminated &&
      maxBurnableCounter(view, player.id) > 0,
  );
}

export function isSpyThiefImmuneSeat(view: PlayingStateView, targetId: string): boolean {
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

export function effectDamage(cardId: CardId, isUpgraded: boolean, multiplier: number): number {
  if (!isAttackCardId(cardId)) {
    return 0;
  }

  return attackDamageFor(cardId, isUpgraded) * multiplier;
}

/** Pending attack from `sourceId` we can cancel (equal or weaker than our riposte). */
export function hasCancelingIncomingFrom(
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

export function hasAnyIncomingFrom(view: PlayingStateView, sourceId: string): boolean {
  return view.pendingEffects.some(
    (effect) =>
      effect.targetPlayerId === view.you &&
      effect.sourcePlayerId === sourceId &&
      isAttackCardId(effect.cardId),
  );
}

export function hasPendingCardFrom(
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

export function knownOpponentLives(view: PlayingStateView, opponentId: string): number | null {
  const player = view.players.find((entry) => entry.id === opponentId);
  const spied = player?.spied;

  if (spied?.lives !== undefined) {
    return spied.lives;
  }

  // Base Spy snapshot is not live — do not treat as lethal-now certainty.
  return null;
}

export function isImmuneTarget(
  view: PlayingStateView,
  targetId: string,
  cardId: CardId,
): boolean {
  const kitId = view.players.find((player) => player.id === targetId)?.spied?.kitId;

  if (kitId === undefined) {
    return false;
  }

  // `isImmuneTo` only reads `kitId` — traits come from the catalog.
  return isImmuneTo({ kitId } as Player, cardId);
}

export function estimateSuicideElims(view: PlayingStateView, ctx: PolicyContext): number {
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

export function rankThreatOpponents(view: PlayingStateView, rng: Rng): string[] {
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

export function ownCards(view: PlayingStateView): readonly CardInstance[] {
  return [...view.self.hand, ...view.self.specialCards];
}

export function isSetupReady(view: PlayingStateView): boolean {
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

export function bestAffordableStrikeDamage(view: PlayingStateView): number {
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

export function hasSentencePlus(view: PlayingStateView): boolean {
  return view.self.specialCards.some(
    (card) => card.cardId === 'sentence' && card.isUpgraded,
  );
}

export function weakestDyingSeat(view: PlayingStateView, strikeDamage: number): string | null {
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

export function hasDyingOpponent(view: PlayingStateView): boolean {
  const strike = bestAffordableStrikeDamage(view);

  if (weakestDyingSeat(view, strike) !== null) {
    return true;
  }

  if (hasSentencePlus(view)) {
    return view.players.some((player) => player.id !== view.you && !player.isEliminated);
  }

  return false;
}

export function hasLethalAvailable(view: PlayingStateView): boolean {
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

export function hasContestThreat(view: PlayingStateView, incomingThreat: number): boolean {
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

export function deriveStance(view: PlayingStateView, incomingThreat: number): HeuristicStance {
  if (hasLethalAvailable(view) || hasDyingOpponent(view)) {
    return 'finish';
  }

  if (isSetupReady(view) && hasContestThreat(view, incomingThreat)) {
    return 'contest';
  }

  return 'build';
}

export function computePointReserve(view: PlayingStateView): number {
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

export function violatesPointReserve(
  _view: PlayingStateView,
  ctx: PolicyContext,
  pointsAfter: number,
): boolean {
  if (ctx.stance === 'finish' || ctx.pointReserve <= 0) {
    return false;
  }

  return pointsAfter < ctx.pointReserve;
}

export function scoreAbsorber(
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

export function estimatedPlayPoints(cardId: CardId, isUpgraded: boolean): number {
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
export function lastCompleteTurnSpendByActor(view: PlayingStateView): {
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

export function sumLivesLostByTarget(view: PlayingStateView): Map<string, number> {
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
export function lastCompleteTurnLivesLostByTarget(view: PlayingStateView): Map<string, number> {
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

export function sumPointsSpentByActor(view: PlayingStateView): Map<string, number> {
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
