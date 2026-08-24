/**
 * Opponent resource reconstruction from the public log — technical spec v5 §4.2
 * (L34-03). No `GameState`. Spy live fields are point intervals; otherwise start
 * from the hypothesized kit's `startingResources` and integrate public changes.
 *
 * Callers pass `lifeLimit` because `PlayingStateView` has no `lifeLimit`. Classic
 * is `CLASSIC_LIFE_LIMIT` from shared (`GameState.lifeLimit` is that same value;
 * do not hardcode 25).
 *
 * Silent changes (persistent ticks, theft amounts, opaque rewards) stay intervals.
 * `evaluate` does not take `BeliefSummary` until Lot 35 — fill features via
 * `extractFeatures(state, id, belief)` only.
 */

import {
  getCard,
  getKit,
  isSharedCardId,
  upgradePointBuyCost,
  upgradePointSellYield,
  type ActionLogEntryView,
  type ActionPlayedLogEntry,
  type ActionResolvedLogEntry,
  type CardId,
  type KitId,
  type PlayingStateView,
  type PublicPlayerView,
} from '@card-battle/shared';

import { MAX_LIVES_PER_USE } from '../../cards/handlers/regeneration';
import { SPECIAL_CARD_PURCHASE_COST } from '../../engine/economy/buy-special-card';
import {
  ELIMINATION_REWARD_LIVES,
  ELIMINATION_REWARD_POINTS,
} from '../../engine/turn/elimination-rewards';
import {
  intervalWidth,
  type BeliefSummary,
  type OpponentResourceBelief,
  type ResourceInterval,
} from './types';

/** Regeneration points per life — `regeneration.ts` POINTS_PER_LIFE_*. */
const REGEN_POINTS_PER_LIFE_BASE = 3;
const REGEN_POINTS_PER_LIFE_UPGRADED = 2;

/** Tax play yield — `tax.ts` TAX_POINTS_*. */
const TAX_POINTS_BASE = 4;
const TAX_POINTS_UPGRADED = 6;

/** Super Regeneration — `super-regeneration.ts` BASE_LIVES / UPGRADED_LIVES. */
const SUPER_REGEN_LIVES_BASE = 9;
const SUPER_REGEN_LIVES_UPGRADED = 18;

/** Upgraded Cloning bonus — `cloning.ts`. */
const CLONING_UPGRADED_POINTS = 10;
const CLONING_UPGRADED_UP = 2;
const CLONING_UPGRADED_LIVES = 4;

/** Ghost credit — `credit-ghost-life-loss.ts`. */
const GHOST_POINTS_PER_LIFE = 2;

/** Thief steal cap — `resolve-pending.ts` `amount: 10`. */
const THIEF_STEAL_CAP = 10;

/** Persistent tick amounts — `apply-persistent-effects.ts`. */
const POINTS_GENERATOR_BASE = 2;
const POINTS_GENERATOR_UPGRADED = 4;
const INVISIBILITY_POINTS_BASE = 4;
const INVISIBILITY_POINTS_UPGRADED = 6;
const IMPOSITION_POINTS_BASE = 2;
const IMPOSITION_POINTS_UPGRADED = 4;
const IMPOSITION_LIVES_BASE = 1;
const IMPOSITION_LIVES_UPGRADED = 2;
const POISON_LIVES_BASE = 1;
const POISON_LIVES_UPGRADED = 2;
const CURSE_POINTS_PER_LIFE_BASE = 3;
const CURSE_POINTS_PER_LIFE_UPGRADED = 2;

/** Two opaque picks per `rewardsClaimed` — rules spec §6. */
const ELIMINATION_REWARD_PICKS = 2;

/**
 * Conservative caps for "steal all" / curse spend — not rule maxima.
 * Feature normalizers use 40 points / 10 UP (`features.ts`).
 */
const POINTS_UNCERTAINTY_CAP = 40;
const UP_UNCERTAINTY_CAP = 10;
const CURSE_POINTS_SPENT_CAP = 40;

interface MutableInterval {
  lo: number;
  hi: number;
}

function point(value: number): ResourceInterval {
  return { lo: value, hi: value };
}

function addExact(interval: MutableInterval, delta: number): void {
  interval.lo += delta;
  interval.hi += delta;
}

function addRange(interval: MutableInterval, minDelta: number, maxDelta: number): void {
  interval.lo += minDelta;
  interval.hi += maxDelta;
}

function creditGhost(points: MutableInterval, livesLost: number, kitId: KitId): void {
  if (kitId !== 'ghost' || livesLost <= 0) {
    return;
  }

  addExact(points, GHOST_POINTS_PER_LIFE * livesLost);
}

function applyExactLifeLoss(
  lives: MutableInterval,
  points: MutableInterval,
  amount: number,
  kitId: KitId,
): void {
  addExact(lives, -amount);
  creditGhost(points, amount, kitId);
}

function clampInterval(interval: MutableInterval, min: number, max: number): ResourceInterval {
  const lo = Math.min(max, Math.max(min, interval.lo));
  const hi = Math.min(max, Math.max(min, interval.hi));

  if (lo <= hi) {
    return { lo, hi };
  }

  return { lo, hi: lo };
}

function clampNonNeg(interval: MutableInterval): ResourceInterval {
  const lo = Math.max(0, interval.lo);
  const hi = Math.max(lo, interval.hi);
  return { lo, hi };
}

function regenPointsPerLife(isUpgraded: boolean): number {
  return isUpgraded ? REGEN_POINTS_PER_LIFE_UPGRADED : REGEN_POINTS_PER_LIFE_BASE;
}

function upgradeBuyCost(kitId: KitId): number {
  return upgradePointBuyCost(kitId);
}

function upgradeSellYield(kitId: KitId): number {
  return upgradePointSellYield(kitId);
}

function livingCount(view: PlayingStateView): number {
  return view.players.filter((player) => !player.isEliminated).length;
}

function playerView(
  view: PlayingStateView,
  playerId: string,
): PublicPlayerView | undefined {
  return view.players.find((player) => player.id === playerId);
}

function hasVisiblePersistent(
  view: PlayingStateView,
  ownerPlayerId: string,
  cardId: CardId,
): boolean {
  const owner = playerView(view, ownerPlayerId);
  return owner?.activePersistentEffects.some((effect) => effect.cardId === cardId) === true;
}

function visiblePersistentUpgraded(
  view: PlayingStateView,
  ownerPlayerId: string,
  cardId: CardId,
): boolean {
  const owner = playerView(view, ownerPlayerId);
  return owner?.activePersistentEffects.some(
    (effect) => effect.cardId === cardId && effect.isUpgraded,
  ) === true;
}

function latestPlay(
  log: readonly ActionLogEntryView[],
  actorPlayerId: string,
  cardId: CardId,
): ActionPlayedLogEntry | undefined {
  let found: ActionPlayedLogEntry | undefined;

  for (const entry of log) {
    if (
      entry.kind === 'actionPlayed' &&
      entry.action === 'playCard' &&
      entry.actorPlayerId === actorPlayerId &&
      entry.cardId === cardId
    ) {
      found = entry;
    }
  }

  return found;
}

function countActorTurns(
  log: readonly ActionLogEntryView[],
  actorPlayerId: string,
  fromTurnSequence: number,
  inclusive: boolean,
): number {
  let count = 0;

  for (const entry of log) {
    if (entry.kind !== 'actionPlayed' || entry.actorPlayerId !== actorPlayerId) {
      continue;
    }

    if (inclusive ? entry.turnSequence >= fromTurnSequence : entry.turnSequence > fromTurnSequence) {
      count += 1;
    }
  }

  return count;
}

function applyShopCost(
  lives: MutableInterval,
  points: MutableInterval,
  kitId: KitId,
  cardId: CardId,
  kind: 'buy' | 'sell',
): void {
  const definition = getCard(cardId);

  if (definition === undefined) {
    return;
  }

  const cost = kind === 'buy' ? definition.buyCost : definition.sellYield;
  const sign = kind === 'buy' ? -1 : 1;
  const pointDelta = (cost.points ?? 0) * sign;
  const lifeDelta = (cost.lives ?? 0) * sign;

  if (pointDelta !== 0) {
    addExact(points, pointDelta);
  }

  if (lifeDelta !== 0) {
    if (sign < 0) {
      applyExactLifeLoss(lives, points, -lifeDelta, kitId);
    } else {
      addExact(lives, lifeDelta);
    }
  }
}

function applyPlayPoints(points: MutableInterval, cardId: CardId): void {
  if (cardId === 'tax' || cardId === 'regeneration') {
    return;
  }

  const playPoints = getCard(cardId)?.cost.points ?? 0;

  if (playPoints > 0) {
    addExact(points, -playPoints);
  }
}

function applyOpponentPlay(
  lives: MutableInterval,
  points: MutableInterval,
  upgradePoints: MutableInterval,
  kitId: KitId,
  entry: ActionPlayedLogEntry,
  lifeLimit: number,
): void {
  const cardId = entry.cardId;
  const upgraded = entry.isUpgraded === true;

  switch (entry.action) {
    case 'draw':
      addExact(points, getKit(kitId).startingResources.draw);
      return;
    case 'buyCard':
      if (cardId !== undefined && isSharedCardId(cardId)) {
        applyShopCost(lives, points, kitId, cardId, 'buy');
      }
      return;
    case 'sellCard':
      if (cardId !== undefined && isSharedCardId(cardId)) {
        applyShopCost(lives, points, kitId, cardId, 'sell');
      }

      if (entry.isUpgraded === true) {
        addExact(upgradePoints, 1);
      } else if (entry.isUpgraded === undefined) {
        addRange(upgradePoints, 0, 1);
      }

      return;
    case 'upgradeCard':
      addExact(upgradePoints, -1);
      return;
    case 'buyUpgradePoint':
      addExact(points, -upgradeBuyCost(kitId));
      addExact(upgradePoints, 1);
      return;
    case 'sellUpgradePoint':
      addExact(upgradePoints, -1);
      addExact(points, upgradeSellYield(kitId));
      return;
    case 'buySpecialCard':
      addExact(points, -SPECIAL_CARD_PURCHASE_COST);
      return;
    case 'playMultipleAttacks':
      for (const attack of entry.attacks ?? []) {
        applyPlayPoints(points, attack.cardId);
      }
      return;
    case 'playCard':
      if (cardId === undefined) {
        return;
      }

      applyPlayPoints(points, cardId);

      if (cardId === 'tax') {
        applyExactLifeLoss(lives, points, getCard('tax')?.cost.lives ?? 1, kitId);
        addExact(points, upgraded ? TAX_POINTS_UPGRADED : TAX_POINTS_BASE);
        return;
      }

      if (cardId === 'regeneration') {
        const perLife = regenPointsPerLife(upgraded);
        addRange(lives, 1, MAX_LIVES_PER_USE);
        addRange(points, -MAX_LIVES_PER_USE * perLife, -perLife);
        return;
      }

      if (cardId === 'super-regeneration') {
        addExact(lives, upgraded ? SUPER_REGEN_LIVES_UPGRADED : SUPER_REGEN_LIVES_BASE);
        return;
      }

      if (cardId === 'cloning') {
        lives.lo = 1;
        lives.hi = lifeLimit;
        points.lo = 0;
        points.hi = POINTS_UNCERTAINTY_CAP;
        upgradePoints.lo = 0;
        upgradePoints.hi = UP_UNCERTAINTY_CAP;

        if (upgraded) {
          addExact(points, CLONING_UPGRADED_POINTS);
          addExact(upgradePoints, CLONING_UPGRADED_UP);
          addExact(lives, CLONING_UPGRADED_LIVES);
        }

        return;
      }

      if (cardId === 'absorber') {
        addRange(lives, 0, lifeLimit);

        if (upgraded) {
          addRange(points, 0, POINTS_UNCERTAINTY_CAP);
          addRange(upgradePoints, 0, UP_UNCERTAINTY_CAP);
        }
      }

      return;
    default:
      return;
  }
}

function applyTheftOnResolve(
  points: MutableInterval,
  upgradePoints: MutableInterval,
  opponentPlayerId: string,
  entry: ActionResolvedLogEntry,
  otherLiving: number,
): void {
  if (entry.outcome !== 'applied') {
    return;
  }

  const asTarget = entry.targetPlayerId === opponentPlayerId;
  const asSource = entry.sourcePlayerId === opponentPlayerId;
  const others = Math.max(1, otherLiving);
  const upgraded = entry.isUpgraded;

  if (entry.cardId === 'thief') {
    const gainCap = THIEF_STEAL_CAP * (upgraded ? 2 : 1);

    if (asTarget) {
      addRange(points, -THIEF_STEAL_CAP, 0);
    }

    if (asSource && !asTarget) {
      addRange(points, 0, gainCap);
    }

    return;
  }

  if (entry.cardId === 'spy-thief') {
    if (asTarget) {
      points.lo = 0;
    }

    if (asSource && !asTarget) {
      addRange(points, 0, POINTS_UNCERTAINTY_CAP * others * (upgraded ? 2 : 1));
    }

    return;
  }

  if (entry.cardId === 'upgrade-point-thief') {
    if (asTarget) {
      upgradePoints.lo = 0;

      if (upgraded) {
        points.lo = 0;
      }
    }

    if (asSource && !asTarget) {
      addRange(upgradePoints, 0, UP_UNCERTAINTY_CAP * others);

      if (upgraded) {
        addRange(points, 0, POINTS_UNCERTAINTY_CAP * others);
      }
    }
  }
}

function applyPersistentTicks(
  lives: MutableInterval,
  points: MutableInterval,
  kitId: KitId,
  opponentPlayerId: string,
  view: PlayingStateView,
  log: readonly ActionLogEntryView[],
): void {
  const pgPlay = latestPlay(log, opponentPlayerId, 'points-generator');

  if (pgPlay !== undefined || hasVisiblePersistent(view, opponentPlayerId, 'points-generator')) {
    const upgraded =
      pgPlay?.isUpgraded === true ||
      visiblePersistentUpgraded(view, opponentPlayerId, 'points-generator');
    const amount = upgraded ? POINTS_GENERATOR_UPGRADED : POINTS_GENERATOR_BASE;
    const from = pgPlay?.turnSequence ?? 0;
    const ticks = countActorTurns(log, opponentPlayerId, from, true);
    const visible = hasVisiblePersistent(view, opponentPlayerId, 'points-generator');

    if (visible && pgPlay !== undefined) {
      addExact(points, amount * ticks);
    } else {
      addRange(points, 0, amount * Math.max(ticks, 1));
    }
  }

  const invisPlay = latestPlay(log, opponentPlayerId, 'invisibility');

  if (invisPlay !== undefined || hasVisiblePersistent(view, opponentPlayerId, 'invisibility')) {
    const upgraded =
      invisPlay?.isUpgraded === true ||
      visiblePersistentUpgraded(view, opponentPlayerId, 'invisibility');
    const amount = upgraded ? INVISIBILITY_POINTS_UPGRADED : INVISIBILITY_POINTS_BASE;
    const from = invisPlay?.turnSequence ?? 0;
    const ticks = countActorTurns(log, opponentPlayerId, from, true);
    const visible = hasVisiblePersistent(view, opponentPlayerId, 'invisibility');

    if (visible && invisPlay !== undefined) {
      addExact(points, amount * ticks);
    } else {
      addRange(points, 0, amount * Math.max(ticks, 1));
    }
  }

  for (const player of view.players) {
    if (player.id === opponentPlayerId) {
      continue;
    }

    for (const effect of player.activePersistentEffects) {
      if (effect.cardId === 'imposition') {
        const play = latestPlay(log, player.id, 'imposition');
        const from = play?.turnSequence ?? 0;
        const ticks = countActorTurns(log, opponentPlayerId, from, false);
        const pointsDue = effect.isUpgraded ? IMPOSITION_POINTS_UPGRADED : IMPOSITION_POINTS_BASE;
        const livesDue = effect.isUpgraded ? IMPOSITION_LIVES_UPGRADED : IMPOSITION_LIVES_BASE;
        addRange(points, -pointsDue * ticks, 0);
        addRange(lives, -livesDue * ticks, 0);

        if (kitId === 'ghost') {
          addRange(points, 0, GHOST_POINTS_PER_LIFE * livesDue * ticks);
        }
      }

      if (effect.cardId === 'poison') {
        const play = latestPlay(log, player.id, 'poison');
        const from = play?.turnSequence ?? 0;
        const ticks = countActorTurns(log, opponentPlayerId, from, false);
        const livesDue = effect.isUpgraded ? POISON_LIVES_UPGRADED : POISON_LIVES_BASE;
        applyExactLifeLoss(lives, points, livesDue * ticks, kitId);
      }
    }
  }

  const curseOnOpp = playerView(view, opponentPlayerId)?.activePersistentEffects.filter(
    (effect) => effect.cardId === 'curse',
  ) ?? [];

  for (const effect of curseOnOpp) {
    const play = log.find(
      (entry): entry is ActionPlayedLogEntry =>
        entry.kind === 'actionPlayed' &&
        entry.action === 'playCard' &&
        entry.cardId === 'curse' &&
        entry.targetPlayerId === opponentPlayerId,
    );
    const from = play?.turnSequence ?? 0;
    const ticks = countActorTurns(log, opponentPlayerId, from, false);
    const divisor = effect.isUpgraded
      ? CURSE_POINTS_PER_LIFE_UPGRADED
      : CURSE_POINTS_PER_LIFE_BASE;
    const maxPerTick = Math.floor(CURSE_POINTS_SPENT_CAP / divisor);
    addRange(lives, -maxPerTick * ticks, 0);
  }
}

function integrateLog(
  opponentPlayerId: string,
  kitId: KitId,
  view: PlayingStateView,
  log: readonly ActionLogEntryView[],
  lifeLimit: number,
): { lives: MutableInterval; points: MutableInterval; upgradePoints: MutableInterval; eliminated: boolean } {
  const start = getKit(kitId).startingResources;
  const lives: MutableInterval = { lo: start.lives, hi: start.lives };
  const points: MutableInterval = { lo: start.points, hi: start.points };
  const upgradePoints: MutableInterval = {
    lo: start.upgradePoints,
    hi: start.upgradePoints,
  };
  let eliminated = playerView(view, opponentPlayerId)?.isEliminated === true;
  const others = Math.max(0, livingCount(view) - 1);

  for (const entry of log) {
    if (entry.kind === 'playerEliminated' && entry.playerId === opponentPlayerId) {
      eliminated = true;
      lives.lo = 0;
      lives.hi = 0;
      continue;
    }

    if (entry.kind === 'playerReanimated' && entry.playerId === opponentPlayerId) {
      const revivedKit = entry.kitId ?? kitId;
      const revived = getKit(revivedKit).startingResources;
      lives.lo = revived.lives;
      lives.hi = revived.lives;
      points.lo = revived.points;
      points.hi = revived.points;
      upgradePoints.lo = revived.upgradePoints;
      upgradePoints.hi = revived.upgradePoints;
      eliminated = false;
      continue;
    }

    if (entry.kind === 'rewardsClaimed' && entry.eliminatorPlayerId === opponentPlayerId) {
      addRange(lives, 0, ELIMINATION_REWARD_LIVES * ELIMINATION_REWARD_PICKS);
      addRange(points, 0, ELIMINATION_REWARD_POINTS * ELIMINATION_REWARD_PICKS);
      addRange(upgradePoints, 0, ELIMINATION_REWARD_PICKS);
      continue;
    }

    if (entry.kind === 'actionResolved') {
      if (entry.targetPlayerId === opponentPlayerId && entry.livesLost > 0) {
        applyExactLifeLoss(lives, points, entry.livesLost, kitId);
      }

      if (entry.cardId === 'suicide' && entry.targetPlayerId === opponentPlayerId && entry.outcome === 'applied') {
        points.lo = 0;
      }

      applyTheftOnResolve(points, upgradePoints, opponentPlayerId, entry, others);
      continue;
    }

    if (entry.kind === 'actionPlayed' && entry.actorPlayerId === opponentPlayerId) {
      applyOpponentPlay(lives, points, upgradePoints, kitId, entry, lifeLimit);
    }
  }

  applyPersistentTicks(lives, points, kitId, opponentPlayerId, view, log);

  return { lives, points, upgradePoints, eliminated };
}

function fromSpy(player: PublicPlayerView): OpponentResourceBelief | null {
  const spied = player.spied;

  if (spied === undefined) {
    return null;
  }

  if (spied.lives !== undefined) {
    return {
      lives: point(spied.lives),
      points: point(spied.points ?? spied.resourcesSnapshot?.points ?? 0),
      upgradePoints: point(spied.upgradePoints ?? spied.resourcesSnapshot?.upgradePoints ?? 0),
    };
  }

  const snapshot = spied.resourcesSnapshot;

  if (snapshot === undefined) {
    return null;
  }

  return {
    lives: point(snapshot.lives),
    points: point(snapshot.points),
    upgradePoints: point(snapshot.upgradePoints),
  };
}

function finalize(
  lives: MutableInterval,
  points: MutableInterval,
  upgradePoints: MutableInterval,
  living: boolean,
  lifeLimit: number,
): OpponentResourceBelief {
  if (!living) {
    return {
      lives: { lo: 0, hi: 0 },
      points: clampNonNeg(points),
      upgradePoints: clampNonNeg(upgradePoints),
    };
  }

  return {
    lives: clampInterval(lives, 1, lifeLimit),
    points: clampNonNeg(points),
    upgradePoints: clampNonNeg(upgradePoints),
  };
}

/**
 * Reconstruct lives / points / upgrade-point intervals for one opponent from
 * public evidence only (technical spec v5 §4.2).
 */
export function reconstructOpponentResources(
  opponentPlayerId: string,
  kitId: KitId,
  view: PlayingStateView,
  log: readonly ActionLogEntryView[],
  lifeLimit: number,
): OpponentResourceBelief {
  if (opponentPlayerId === view.you) {
    return {
      lives: point(view.self.lives),
      points: point(view.self.points),
      upgradePoints: point(view.self.upgradePoints),
    };
  }

  const player = playerView(view, opponentPlayerId);

  if (player === undefined) {
    return {
      lives: point(1),
      points: point(0),
      upgradePoints: point(0),
    };
  }

  const spied = fromSpy(player);

  if (spied !== null) {
    return spied;
  }

  if (player.isEliminated && player.eliminationReveal !== undefined) {
    const reveal = player.eliminationReveal;
    return {
      lives: point(reveal.lives),
      points: point(reveal.points),
      upgradePoints: point(reveal.upgradePoints),
    };
  }

  const integrated = integrateLog(opponentPlayerId, kitId, view, log, lifeLimit);
  const living = !player.isEliminated && !integrated.eliminated;

  return finalize(
    integrated.lives,
    integrated.points,
    integrated.upgradePoints,
    living,
    lifeLimit,
  );
}

function livingOpponentsInSeatOrder(
  perspectivePlayerId: string,
  view: PlayingStateView,
): readonly string[] {
  const order = view.turnOrder;
  const start = order.indexOf(perspectivePlayerId);
  const rotated =
    start < 0
      ? [...order]
      : [...order.slice(start + 1), ...order.slice(0, start)];

  return rotated.filter((playerId) => {
    if (playerId === perspectivePlayerId) {
      return false;
    }

    const player = playerView(view, playerId);
    return player !== undefined && !player.isEliminated;
  });
}

/**
 * Normalized life-interval widths for living opponents, seat offsets 1..3
 * relative to `perspectivePlayerId` (technical spec v5 §5.1 Belief group).
 */
export function buildBeliefSummary(
  perspectivePlayerId: string,
  view: PlayingStateView,
  log: readonly ActionLogEntryView[],
  kitByOpponentId: ReadonlyMap<string, KitId>,
  lifeLimit: number,
): BeliefSummary {
  const opponents = livingOpponentsInSeatOrder(perspectivePlayerId, view);
  const widths: [number, number, number] = [0, 0, 0];

  for (let offset = 0; offset < 3; offset += 1) {
    const opponentId = opponents[offset];

    if (opponentId === undefined) {
      continue;
    }

    const kitId = kitByOpponentId.get(opponentId);

    if (kitId === undefined) {
      continue;
    }

    const belief = reconstructOpponentResources(
      opponentId,
      kitId,
      view,
      log,
      lifeLimit,
    );
    const raw = lifeLimit > 0 ? intervalWidth(belief.lives) / lifeLimit : 0;
    widths[offset] = raw <= 0 ? 0 : raw >= 1 ? 1 : raw;
  }

  return { lifeWidthByOpponentOffset: widths };
}

/**
 * Uniform integer sample in `[lo, hi]` inclusive. `rng.next()` is in `[0, 1)`.
 */
export function sampleFromInterval(
  interval: ResourceInterval,
  rng: { next: () => number },
): number {
  const span = interval.hi - interval.lo;

  if (span <= 0) {
    return interval.lo;
  }

  const unit = rng.next();
  const bounded = unit >= 1 ? 0 : unit < 0 ? 0 : unit;
  return interval.lo + Math.min(span, Math.floor(bounded * (span + 1)));
}
