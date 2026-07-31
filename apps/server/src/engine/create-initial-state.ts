/**
 * Build the authoritative GameState at launch — backlog L1-03 / L4-02.
 *
 * Kit assignment (with replacement), resources, random shared-card draws, and kit
 * specials — rules spec §4 / §6. Turn order is a seeded shuffle of seated players
 * (AGENTS golden rule 5).
 */

import {
  ACTION_CARD_IDS,
  ATTACK_CARD_IDS,
  CLASSIC_LIFE_LIMIT,
  getKit,
  KIT_IDS,
  type GameState,
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
}

export function createInitialState(options: CreateInitialStateOptions): GameState {
  if (options.seats.length < 2) {
    throw new RangeError('createInitialState needs at least two seated players');
  }

  const seed = options.seed ?? createSeed();
  const rng = options.rng ?? createRng(seed);
  const orderedSeats = rng.shuffle(options.seats);

  const players: Player[] = orderedSeats.map((seat) => makePlayer(seat, rng));

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
    eliminationContributors: [],
    rewardQueue: [],
    rewardChoice: null,
  };
}

function makePlayer(seat: SeatInput, rng: Rng): Player {
  const kitId = rng.pick(KIT_IDS);
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
  };

  for (let index = 0; index < kit.startingCardCounts.action; index += 1) {
    acquireCardToHand(player, rng.pick(ACTION_CARD_IDS));
  }

  for (let index = 0; index < kit.startingCardCounts.attack; index += 1) {
    acquireCardToHand(player, rng.pick(ATTACK_CARD_IDS));
  }

  for (const specialId of kit.specialCards) {
    acquireSpecialCard(player, specialId);
  }

  return player;
}
