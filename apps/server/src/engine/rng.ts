/**
 * The seeded generator every draw in the game goes through — technical spec §8,
 * AGENTS golden rule 5.
 *
 * Card distribution (rules spec §4), Sentence's victim, the 20-point special card purchase
 * and Mirror's default target on expiry (technical spec §5.6) all draw from here, and from
 * an instance that was *injected* into them. `Math.random()` appears nowhere: without a
 * seed no distribution or Sentence test is reproducible, and no reported game can be
 * replayed.
 *
 * Server-side only. The client never draws, and the seed must never reach it (see
 * `GameState.seed`).
 */

import { randomUUID } from 'node:crypto';

export interface Rng {
  /** A uniformly drawn integer in `[0, maxExclusive)`. */
  nextInt(maxExclusive: number): number;
  /** A uniformly drawn element of `items`. Throws when `items` is empty. */
  pick<T>(items: readonly T[]): T;
  /**
   * Fisher–Yates shuffle of a copy of `items`. Same seed → same order.
   * Used for turn order at game start (L1-03); later for kit distribution.
   */
  shuffle<T>(items: readonly T[]): T[];
}

/** FNV-1a, 32-bit: turns the seed string into the generator's starting state. */
function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/**
 * A generator seeded from `seed`: the same seed always produces the same sequence, and two
 * instances are independent of each other.
 *
 * The algorithm (mulberry32) is an implementation detail — the tests assert reproducibility
 * and uniform bounds, never specific numbers, so it can be replaced without rewriting them.
 */
export function createRng(seed: string): Rng {
  if (seed.length === 0) {
    // An empty seed is almost always a missing seed, and would make every game identical.
    throw new RangeError('createRng received an empty seed');
  }

  let state = hashSeed(seed);

  const nextUint32 = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return (value ^ (value >>> 14)) >>> 0;
  };

  const nextInt = (maxExclusive: number): number => {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError(`nextInt needs a positive integer bound, received ${maxExclusive}`);
    }

    // Rejection sampling: taking the modulo of a raw draw would favour the low end of the
    // range, which would quietly bias card distribution and Sentence.
    const limit = 2 ** 32 - (2 ** 32 % maxExclusive);
    let value = nextUint32();

    while (value >= limit) {
      value = nextUint32();
    }

    return value % maxExclusive;
  };

  return {
    nextInt,
    pick<T>(items: readonly T[]): T {
      const item = items[nextInt(items.length)];

      if (item === undefined) {
        // Only reachable on an empty input: nextInt rejects a bound of 0.
        throw new RangeError('pick received an empty list');
      }

      return item;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const copy = [...items];

      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = nextInt(index + 1);
        const current = copy[index];
        const swapped = copy[swapIndex];

        if (current === undefined || swapped === undefined) {
          throw new Error('shuffle indexing failed');
        }

        copy[index] = swapped;
        copy[swapIndex] = current;
      }

      return copy;
    },
  };
}

/** A fresh seed for a new game. Recorded on the state so the game can be replayed. */
export function createSeed(): string {
  return randomUUID();
}
