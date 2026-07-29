/**
 * Build the authoritative GameState at launch — backlog L1-03.
 *
 * Placeholder resources and a fixed basic-attack hand until L4-02. Turn order is a
 * seeded shuffle of the seated players (AGENTS golden rule 5).
 */

import {
  CLASSIC_LIFE_LIMIT,
  type CardInstance,
  type GameState,
  type Player,
} from '@card-battle/shared';
import { randomUUID } from 'node:crypto';

import {
  L1_BASIC_ATTACK_COPIES,
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
    hand: makeBasicAttackHand(),
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

function makeBasicAttackHand(): CardInstance[] {
  return Array.from({ length: L1_BASIC_ATTACK_COPIES }, () => ({
    instanceId: randomUUID(),
    cardId: 'basic-attack',
    isUpgraded: false,
  }));
}
