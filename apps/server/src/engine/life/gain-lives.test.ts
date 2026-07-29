import { CLASSIC_LIFE_LIMIT } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { makePlayer } from '../../testing/factories';
import { gainLives } from './gain-lives';

describe('gainLives — the life cap (rules spec §7, technical spec §6.3)', () => {
  it('grants the full amount when it stays under the cap', () => {
    const target = makePlayer({ lives: 10 });

    const outcome = gainLives(target, 4, CLASSIC_LIFE_LIMIT);

    expect(target.lives).toBe(14);
    expect(outcome).toEqual({ livesGained: 4, livesWasted: 0 });
  });

  it('clamps at the cap and loses the excess', () => {
    const target = makePlayer({ lives: 23 });

    const outcome = gainLives(target, 4, CLASSIC_LIFE_LIMIT);

    expect(target.lives).toBe(CLASSIC_LIFE_LIMIT);
    expect(outcome).toEqual({ livesGained: 2, livesWasted: 2 });
  });

  it('grants nothing to a player already at the cap', () => {
    const target = makePlayer({ lives: CLASSIC_LIFE_LIMIT });

    const outcome = gainLives(target, 9, CLASSIC_LIFE_LIMIT);

    expect(target.lives).toBe(CLASSIC_LIFE_LIMIT);
    expect(outcome).toEqual({ livesGained: 0, livesWasted: 9 });
  });

  it('honours a cap other than the Classic one, since the cap is a parameter', () => {
    const target = makePlayer({ lives: 19 });

    const outcome = gainLives(target, 4, 20);

    expect(target.lives).toBe(20);
    expect(outcome).toEqual({ livesGained: 1, livesWasted: 3 });
  });
});

describe('gainLives — boundaries', () => {
  it('rejects a negative amount instead of bypassing the loss primitives', () => {
    const target = makePlayer({ lives: 10 });

    expect(() => gainLives(target, -4, CLASSIC_LIFE_LIMIT)).toThrow(RangeError);
    expect(target.lives).toBe(10);
  });
});
