/**
 * Build the authoritative GameState at launch — backlog L1-03.
 *
 * Placeholder resources until L4-02. Temporary full shared-card hand for playtesting
 * until kit distribution lands (developer instruction 2026-07-30). Turn order is a
 * seeded shuffle of the seated players (AGENTS golden rule 5).
 */

import {
  CLASSIC_LIFE_LIMIT,
  SHARED_CARD_IDS,
  type CardInstance,
  type GameState,
  type Player,
  type SharedCardId,
} from '@card-battle/shared';
import { randomUUID } from 'node:crypto';

import {
  L1_PLACEHOLDER_KIT_ID,
  L1_PLACEHOLDER_RESOURCES,
} from './l1-placeholders';
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
}

export function createInitialState(options: CreateInitialStateOptions): GameState {
  if (options.seats.length < 2) {
    throw new RangeError('createInitialState needs at least two seated players');
  }

  const seed = options.seed ?? createSeed();
  const rng = options.rng ?? createRng(seed);
  const orderedSeats = rng.shuffle(options.seats);

  const players: Player[] = orderedSeats.map((seat) => makePlaceholderPlayer(seat));

  const first = players[0];

  if (first === undefined) {
    throw new Error('createInitialState produced no players');
  }

  return {
    mode: 'classic',
    lifeLimit: CLASSIC_LIFE_LIMIT,
    players,
    pool: [],
    currentTurnPlayerId: first.id,
    turnSequence: 0,
    seed,
    visibility: [],
    mirrorChoice: null,
  };
}

function makePlaceholderPlayer(seat: SeatInput): Player {
  return {
    id: seat.id,
    nickname: seat.nickname,
    kitId: L1_PLACEHOLDER_KIT_ID,
    lives: L1_PLACEHOLDER_RESOURCES.lives,
    points: L1_PLACEHOLDER_RESOURCES.points,
    upgradePoints: L1_PLACEHOLDER_RESOURCES.upgradePoints,
    shield: 0,
    shieldIsUpgraded: false,
    hand: makeFullSharedHand(),
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
  };
}

/**
 * One copy of every V1 shared card (10 attacks + actions). Temporary until L4-02
 * kit distribution. Specials stay kit-granted.
 */
function makeFullSharedHand(): CardInstance[] {
  return SHARED_CARD_IDS.map((cardId: SharedCardId) => ({
    instanceId: randomUUID(),
    cardId,
    isUpgraded: false,
  }));
}
