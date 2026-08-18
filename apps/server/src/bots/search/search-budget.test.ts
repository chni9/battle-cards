/**
 * Search budget helpers — L35-01 / depth floor (tech §6.4).
 */

import { describe, expect, it } from 'vitest';

import {
  assertDepthCapRounds,
  DEPTH_CAP_ROUNDS_FLOOR,
  maxWidenedChildren,
  OFFLINE_SEARCH_ITERATIONS,
  resolveIterationBudget,
  resolveSearchLoop,
  WIDENING_ALPHA,
  WIDENING_C,
} from './search-budget';

describe('search-budget (L35-01 / L36-01)', () => {
  it('defaults offline iterations to the L32-05-cited constant', () => {
    expect(OFFLINE_SEARCH_ITERATIONS).toBe(64);
    expect(resolveIterationBudget(undefined)).toBe(64);
    expect(resolveIterationBudget({ kind: 'iterations', n: 50 })).toBe(50);
  });

  it('resolves wall-clock loops with a deadline and safety cap', () => {
    const loop = resolveSearchLoop({ kind: 'wall-clock', ms: 100 }, 1_000);
    expect(loop.mode).toBe('wall-clock');

    if (loop.mode !== 'wall-clock') {
      return;
    }

    expect(loop.deadlineMs).toBe(1_100);
    expect(loop.safetyMaxIterations).toBe(1_000);
  });

  it('rejects depthCapRounds below the two-round floor', () => {
    expect(DEPTH_CAP_ROUNDS_FLOOR).toBe(2);
    expect(assertDepthCapRounds(2)).toBe(2);
    expect(assertDepthCapRounds(3)).toBe(3);
    expect(() => assertDepthCapRounds(1)).toThrow(/depthCapRounds/);
  });

  it('exposes progressive-widening module constants', () => {
    expect(WIDENING_C).toBe(1);
    expect(WIDENING_ALPHA).toBe(0.5);
    expect(maxWidenedChildren(1)).toBe(1);
    expect(maxWidenedChildren(100)).toBe(10);
  });
});
