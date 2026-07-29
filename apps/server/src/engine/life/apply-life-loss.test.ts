import { describe, expect, it } from 'vitest';

import { makeCounterEffect, makePlayer } from '../../testing/factories';
import { applyLifeLoss } from './apply-life-loss';

describe('applyLifeLoss — the shield never intervenes (rules spec §1, §3)', () => {
  it('takes the life of a player behind a full shield, leaving the shield intact', () => {
    const target = makePlayer({ lives: 10, shield: 7 });

    const outcome = applyLifeLoss(target, 1, 'tax');

    expect(target.lives).toBe(9);
    expect(target.shield).toBe(7);
    expect(outcome).toEqual({ reason: 'tax', livesLost: 1 });
  });
});

describe('applyLifeLoss — internal counters are never touched (rules spec §5)', () => {
  it('leaves a counter untouched even though the player lost a life', () => {
    const effect = makeCounterEffect({ counter: 3 });
    const target = makePlayer({ lives: 10, activePersistentEffects: [effect] });

    applyLifeLoss(target, 1, 'tax');

    expect(target.lives).toBe(9);
    expect(effect.counter).toBe(3);
    expect(target.activePersistentEffects).toEqual([effect]);
  });

  it('leaves a counter of 1 alive even on a multi-life loss', () => {
    const effect = makeCounterEffect({ counter: 1 });
    const target = makePlayer({ lives: 10, activePersistentEffects: [effect] });

    applyLifeLoss(target, 5, 'suicide');

    expect(effect.counter).toBe(1);
    expect(target.activePersistentEffects).toEqual([effect]);
  });
});

describe('applyLifeLoss — boundaries', () => {
  it('floors lives at 0 and reports only the lives actually lost', () => {
    const target = makePlayer({ lives: 2 });

    const outcome = applyLifeLoss(target, 5, 'suicide');

    expect(target.lives).toBe(0);
    expect(outcome.livesLost).toBe(2);
  });

  it('does not eliminate the player itself — the turn loop does (technical spec §4.3)', () => {
    const target = makePlayer({ lives: 1 });

    applyLifeLoss(target, 1, 'tax');

    expect(target.isEliminated).toBe(false);
  });

  it('rejects a negative amount instead of granting a life', () => {
    const target = makePlayer({ lives: 10 });

    expect(() => applyLifeLoss(target, -2, 'imposition')).toThrow(RangeError);
    expect(target.lives).toBe(10);
  });
});
