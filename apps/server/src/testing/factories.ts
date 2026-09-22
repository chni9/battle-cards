/**
 * Domain factories for tests. Every field has a neutral default so a test states only
 * what its rule is about, and a field added to the domain does not force every test to
 * be edited.
 */

import { emptyMatchStats, type PersistentEffect, type Player } from '@card-battle/shared';

import type { Rng } from '../engine/rng';

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    nickname: 'Player 1',
    kitId: 'kamikaze',
    lives: 10,
    points: 0,
    upgradePoints: 0,
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
    matchStats: emptyMatchStats(),
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
    ...overrides,
  };
}

/**
 * A persistent effect with an internal counter — the "card lives" of rules spec §5.
 * Defaults to Points Generator's starting counter of 3.
 */
export function makeCounterEffect(overrides: Partial<PersistentEffect> = {}): PersistentEffect {
  return {
    id: 'effect-1',
    cardId: 'points-generator',
    isUpgraded: false,
    counter: 3,
    targetPlayerId: null,
    ...overrides,
  };
}

/** Deterministic `Rng` that yields `ints` from `nextInt` in order. */
export function scriptedRng(ints: readonly number[], fallback?: Rng): Rng {
  const queue = [...ints];
  const nextInt = (maxExclusive: number): number => {
    const value = queue.shift();
    if (value === undefined) {
      if (fallback !== undefined) {
        return fallback.nextInt(maxExclusive);
      }
      throw new Error('scriptedRng exhausted');
    }
    if (!Number.isInteger(value) || value < 0 || value >= maxExclusive) {
      throw new RangeError(
        `scripted nextInt ${String(value)} out of [0, ${String(maxExclusive)})`,
      );
    }
    return value;
  };

  return {
    nextInt,
    pick<T>(items: readonly T[]): T {
      const item = items[nextInt(items.length)];
      if (item === undefined) {
        throw new RangeError('pick received an empty list');
      }
      return item;
    },
    shuffle<T>(items: readonly T[]): T[] {
      return [...items];
    },
  };
}
