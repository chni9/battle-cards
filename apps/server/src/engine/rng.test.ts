import { ACTION_CARD_IDS, ATTACK_CARD_IDS, type CardId } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createRng, createSeed, type Rng } from './rng';

/** Stands in for L4-02's starting distribution: 5 action cards, duplicates allowed. */
function drawStartingCards(rng: Rng, count: number): CardId[] {
  const available: readonly CardId[] = [...ACTION_CARD_IDS, ...ATTACK_CARD_IDS];

  return Array.from({ length: count }, () => rng.pick(available));
}

describe('createRng — reproducibility (technical spec §8, golden rule 5)', () => {
  it('produces an identical distribution for two games launched with the same seed', () => {
    const first = drawStartingCards(createRng('a-fixed-seed'), 5);
    const second = drawStartingCards(createRng('a-fixed-seed'), 5);

    expect(second).toEqual(first);
  });

  it('produces an identical sequence of integers for the same seed', () => {
    const first = createRng('another-seed');
    const second = createRng('another-seed');

    const firstDraws = Array.from({ length: 20 }, () => first.nextInt(100));
    const secondDraws = Array.from({ length: 20 }, () => second.nextInt(100));

    expect(secondDraws).toEqual(firstDraws);
  });

  it('diverges for different seeds', () => {
    const first = createRng('seed-a');
    const second = createRng('seed-b');

    const firstDraws = Array.from({ length: 20 }, () => first.nextInt(1000));
    const secondDraws = Array.from({ length: 20 }, () => second.nextInt(1000));

    expect(secondDraws).not.toEqual(firstDraws);
  });

  it('keeps two instances independent, so one game cannot shift another', () => {
    const reference = createRng('shared-seed');
    const referenceDraws = Array.from({ length: 6 }, () => reference.nextInt(50));

    const interleaved = createRng('shared-seed');
    const noise = createRng('noise');
    const interleavedDraws = Array.from({ length: 6 }, () => {
      noise.nextInt(50);
      return interleaved.nextInt(50);
    });

    expect(interleavedDraws).toEqual(referenceDraws);
  });
});

describe('createRng — bounds', () => {
  it('stays inside [0, maxExclusive)', () => {
    const rng = createRng('bounds');
    const draws = Array.from({ length: 500 }, () => rng.nextInt(4));

    expect(draws.filter((value) => value < 0 || value > 3)).toEqual([]);
  });

  it('reaches every value of a small range, so no player is unreachable', () => {
    const rng = createRng('coverage');
    const draws = Array.from({ length: 500 }, () => rng.nextInt(4));

    expect([...new Set(draws)].sort()).toEqual([0, 1, 2, 3]);
  });

  it('rejects a bound that is not a positive integer', () => {
    const rng = createRng('guards');

    expect(() => rng.nextInt(0)).toThrow(RangeError);
    expect(() => rng.nextInt(-2)).toThrow(RangeError);
    expect(() => rng.nextInt(1.5)).toThrow(RangeError);
  });

  it('rejects an empty seed, which would make every game identical', () => {
    expect(() => createRng('')).toThrow(RangeError);
  });
});

describe('createRng — pick', () => {
  it('returns an element of the list it was given', () => {
    const rng = createRng('pick');
    const items = ['thief', 'spy', 'mirror'] as const;

    const drawn = Array.from({ length: 30 }, () => rng.pick(items));

    expect(drawn.filter((item) => !items.includes(item))).toEqual([]);
  });

  it('rejects an empty list', () => {
    const rng = createRng('pick-empty');

    expect(() => rng.pick([])).toThrow(RangeError);
  });
});

describe('createSeed', () => {
  it('returns a fresh non-empty seed each time', () => {
    const first = createSeed();
    const second = createSeed();

    expect(first).not.toBe('');
    expect(second).not.toBe(first);
  });

  it('returns a seed the generator accepts', () => {
    const seed = createSeed();

    expect(createRng(seed).nextInt(4)).toBeGreaterThanOrEqual(0);
  });
});
