/**
 * Build the authoritative GameState at launch — backlog L1-03 / L4-02.
 *
 * Kit assignment (with replacement), resources, random shared-card draws, and kit
 * specials — rules spec §4 / §6. Turn order is a seeded shuffle of seated players
 * (AGENTS golden rule 5).
 *
 * Optional `kitAssignment` (L18-02 / tech §8): kits bind to **input** seat index
 * before shuffle; shuffle only reorders turn order. Optional `forcedKitsBySeatId`
 * (L49-01): per-seat lobby picks; omitted seats stay random. `kitAssignment` wins
 * when both are set.
 */

import {
  CLASSIC_LIFE_LIMIT,
  getKit,
  isKitId,
  KIT_IDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type GameState,
  type KitId,
  type Player,
} from '@card-battle/shared';

import { createRng, createSeed, type Rng } from './rng';
import { dealStartingLoadout } from './reanimate-player';

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
  /**
   * Lobby picks keyed by seat id (PROTOCOL_VERSION 30 / L49-01). Seats absent
   * from the map stay random. Ignored when `kitAssignment` is set.
   */
  forcedKitsBySeatId?: ReadonlyMap<string, KitId>;
}

export function createInitialState(options: CreateInitialStateOptions): GameState {
  if (options.seats.length < MIN_PLAYERS) {
    throw new RangeError(
      `createInitialState needs at least ${String(MIN_PLAYERS)} seated players`,
    );
  }

  if (options.seats.length > MAX_PLAYERS) {
    throw new RangeError(
      `createInitialState supports at most ${String(MAX_PLAYERS)} seated players`,
    );
  }

  const kitBySeatId = buildKitBySeatId(
    options.seats,
    options.kitAssignment,
    options.forcedKitsBySeatId,
  );

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
  forcedKitsBySeatId: ReadonlyMap<string, KitId> | undefined,
): ReadonlyMap<string, KitId> | undefined {
  if (kitAssignment !== undefined) {
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

  if (forcedKitsBySeatId === undefined || forcedKitsBySeatId.size === 0) {
    return undefined;
  }

  return forcedKitsBySeatId;
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
    duplicationActive: false,
    eliminationSnapshot: null,
    pendingReanimation: null,
    absorbWindowPendingPlayerIds: null,
  };

  dealStartingLoadout(player, kitId, rng, `${seat.id}:start`);
  return player;
}
