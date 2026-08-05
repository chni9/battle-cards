/**
 * Build the authoritative GameState at launch — backlog L1-03 / L4-02.
 *
 * Kit assignment (with replacement), resources, random shared-card draws, and kit
 * specials — rules spec §4 / §6. Turn order is a seeded shuffle of seated players
 * (AGENTS golden rule 5).
 *
 * Optional `kitAssignment` (L18-02 / tech §8): kits bind to **input** seat index
 * before shuffle; shuffle only reorders turn order.
 */

import {
  ACTION_CARD_IDS,
  ATTACK_CARD_IDS,
  CLASSIC_LIFE_LIMIT,
  getKit,
  isKitId,
  KIT_IDS,
  type GameState,
  type KitId,
  type Player,
} from '@card-battle/shared';

import { acquireCardToHand, acquireSpecialCard } from './kits/acquire-card';
import { createRng, createSeed, type Rng } from './rng';

export interface SeatInput {
  id: string;
  nickname: string;
}

export interface CreateInitialStateOptions {
  seats: readonly SeatInput[];
  /** Injected in tests for reproducibility. Fresh UUID when omitted. */
  seed?: string;
  /** Injected in tests. Built from `seed` when omitted. */
  rng?: Rng;
  /**
   * Forced kits by input seat index (simulator / tests). Length must match
   * `seats`. Omitted → random `rng.pick(KIT_IDS)` with replacement.
   */
  kitAssignment?: readonly KitId[];
}

export function createInitialState(options: CreateInitialStateOptions): GameState {
  if (options.seats.length < 2) {
    throw new RangeError('createInitialState needs at least two seated players');
  }

  const kitBySeatId = buildKitBySeatId(options.seats, options.kitAssignment);

  const seed = options.seed ?? createSeed();
  const rng = options.rng ?? createRng(seed);
  const orderedSeats = rng.shuffle(options.seats);

  const players: Player[] = orderedSeats.map((seat) =>
    makePlayer(seat, rng, kitBySeatId?.get(seat.id)),
  );

  const first = players[0];

  if (first === undefined) {
    throw new Error('createInitialState produced no players');
  }

  return {
    mode: 'classic',
    lifeLimit: CLASSIC_LIFE_LIMIT,
    players,
    pool: [],
    nextPoolInstanceSeq: 0,
    currentTurnPlayerId: first.id,
    turnSequence: 0,
    seed,
    visibility: [],
    mirrorChoice: null,
    stealChoice: null,
    subChoice: null,
    eliminationContributors: [],
    rewardQueue: [],
    rewardChoice: null,
  };
}

function buildKitBySeatId(
  seats: readonly SeatInput[],
  kitAssignment: readonly KitId[] | undefined,
): ReadonlyMap<string, KitId> | undefined {
  if (kitAssignment === undefined) {
    return undefined;
  }

  if (kitAssignment.length !== seats.length) {
    throw new RangeError(
      `kitAssignment length ${String(kitAssignment.length)} must match seats (${String(seats.length)})`,
    );
  }

  const map = new Map<string, KitId>();

  for (const [index, seat] of seats.entries()) {
    const kitId = kitAssignment[index];

    if (kitId === undefined || !isKitId(kitId)) {
      throw new RangeError(`kitAssignment[${String(index)}] is not a KitId`);
    }

    map.set(seat.id, kitId);
  }

  return map;
}

function makePlayer(seat: SeatInput, rng: Rng, forcedKitId: KitId | undefined): Player {
  const kitId = forcedKitId ?? rng.pick(KIT_IDS);
  const kit = getKit(kitId);

  const player: Player = {
    id: seat.id,
    nickname: seat.nickname,
    kitId,
    lives: kit.startingResources.lives,
    points: kit.startingResources.points,
    upgradePoints: kit.startingResources.upgradePoints,
    shield: 0,
    shieldIsUpgraded: false,
    hand: [],
    specialCards: [],
    pendingEffects: [],
    activePersistentEffects: [],
    turnLedger: {
      livesLost: 0,
      pointsSpent: 0,
      upgradePointsSpent: 0,
      pointsLostToTheft: 0,
      upgradePointsLostToTheft: 0,
    },
    connectionState: {
      status: 'connected',
      disconnectedAt: null,
      automaticTurnsTaken: 0,
      consecutiveTimeouts: 0,
    },
    isEliminated: false,
    blockTurnsRemaining: 0,
    blockAttacksForbidden: false,
    attackBlockCharges: 0,
    eliminationSnapshot: null,
  };

  for (let index = 0; index < kit.startingCardCounts.action; index += 1) {
    const cardId = rng.pick(ACTION_CARD_IDS);
    acquireCardToHand(player, cardId, `${seat.id}:start:action:${String(index)}`);
  }

  for (let index = 0; index < kit.startingCardCounts.attack; index += 1) {
    const cardId = rng.pick(ATTACK_CARD_IDS);
    acquireCardToHand(player, cardId, `${seat.id}:start:attack:${String(index)}`);
  }

  for (const [index, specialId] of kit.specialCards.entries()) {
    acquireSpecialCard(player, specialId, `${seat.id}:start:special:${String(index)}`);
  }

  return player;
}
