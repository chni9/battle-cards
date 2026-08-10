/**
 * Smoke for L32-05 bench harness — numbers themselves live in decisions.md.
 */

import { describe, expect, it } from 'vitest';

import { buildBenchState, runForwardModelBench } from './bench-forward-model';

describe('bench-forward-model (L32-05)', () => {
  it('builds a 4-player fixture with pool and persistents', () => {
    const state = buildBenchState();
    expect(state.players).toHaveLength(4);
    expect(state.pool.length).toBeGreaterThan(0);
    expect(
      state.players.some((player) => player.activePersistentEffects.length > 0),
    ).toBe(true);
  });

  it('returns finite positive throughput figures', () => {
    const result = runForwardModelBench({
      cloneIters: 50,
      turnIters: 10,
      playoutIters: 5,
      playoutDepth: 4,
    });

    expect(result.structuredCloneNs).toBeGreaterThan(0);
    expect(result.structuredCloneBytes).toBeGreaterThan(0);
    expect(result.cloneGameStateNs).toBeGreaterThan(0);
    expect(result.turnsPerSecond).toBeGreaterThan(0);
    expect(result.truncatedPlayoutsPerSecond).toBeGreaterThan(0);
  });
});
