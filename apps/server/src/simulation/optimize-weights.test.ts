/**
 * Optimizer smoke — L33-03.
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DEFAULT_POLICY_WEIGHTS } from '../bots/policy-weights';
import { createRng } from '../engine/rng';
import { buildFitSplit } from './fit-split';
import { mutatePolicyWeights } from './mutate-weights';
import { runOptimize } from './optimize-weights';

describe('optimize-weights (L33-03)', () => {
  it('mutate is deterministic for the same seed', () => {
    const a = mutatePolicyWeights(DEFAULT_POLICY_WEIGHTS, createRng('mut-a'), 1);
    const b = mutatePolicyWeights(DEFAULT_POLICY_WEIGHTS, createRng('mut-a'), 1);
    expect(a).toEqual(b);
  });

  it('fit split is stable for the same base seed', () => {
    const a = buildFitSplit({ baseSeed: 'split', trainCount: 4, holdoutCount: 4 });
    const b = buildFitSplit({ baseSeed: 'split', trainCount: 4, holdoutCount: 4 });
    expect(a).toEqual(b);
    expect(a.train).toHaveLength(4);
    expect(a.holdout).toHaveLength(4);
  });

  it('checkpoint resume continues from the saved generation', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-opt-'));

    try {
      const first = await runOptimize({
        seed: 'l33-03-smoke',
        outDir: dir,
        generations: 1,
        lambda: 1,
        trainCount: 1,
        holdoutCount: 1,
        sigma: 0.5,
        maxTurns: 80,
      });

      expect(first.curve).toHaveLength(1);

      const second = await runOptimize({
        seed: 'l33-03-smoke',
        outDir: dir,
        generations: 2,
        lambda: 1,
        trainCount: 1,
        holdoutCount: 1,
        sigma: 0.5,
        maxTurns: 80,
      });

      expect(second.curve).toHaveLength(2);
      expect(second.curve[0]).toEqual(first.curve[0]);

      const checkpoint = JSON.parse(
        await readFile(path.join(dir, 'checkpoint.json'), 'utf8'),
      ) as { generation: number };
      expect(checkpoint.generation).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
