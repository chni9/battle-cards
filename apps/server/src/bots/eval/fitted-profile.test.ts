/**
 * Evaluate dispatch with checked-in logistic-v5 — L37-02.
 */

import { describe, expect, it } from 'vitest';

import type { GameState } from '@card-battle/shared';

import { DEFAULT_POLICY_WEIGHTS, parsePolicyWeights } from '../policy-weights';
import { resolveWeightsProfile } from '../profiles/index';
import { evaluateFromFeatures } from './evaluate';
import { FEATURE_DIM } from './features';
import { clearFittedModelCache, loadFittedModel } from './fitted';

describe('fitted profile wiring (L37-02)', () => {
  it('loads logistic-v5 and evaluates a two-seat vector', () => {
    clearFittedModelCache();
    const model = loadFittedModel('logistic-v5');
    expect(model.kind).toBe('logistic');
    expect(model.featureDim).toBe(FEATURE_DIM);

    const weights = resolveWeightsProfile('search-fitted-logistic');
    expect(weights.evaluator.kind).toBe('fitted-logistic');
    expect(weights.evaluator.fittedModelId).toBe('logistic-v5');

    const state = {
      players: [
        { id: 'a', isEliminated: false, lives: 12 },
        { id: 'b', isEliminated: false, lives: 8 },
      ],
      lifeLimit: 25,
    } as unknown as GameState;

    const featureByPlayerId = new Map([
      ['a', Float64Array.from(Array.from({ length: FEATURE_DIM }, () => 0.1))],
      ['b', Float64Array.from(Array.from({ length: FEATURE_DIM }, () => 0.2))],
    ]);

    const probs = evaluateFromFeatures(state, ['a', 'b'], featureByPlayerId, weights);
    expect(probs).toHaveLength(2);
    expect((probs[0] ?? 0) + (probs[1] ?? 0)).toBeCloseTo(1, 9);

    // Linear default still parses without kind.
    expect(parsePolicyWeights(DEFAULT_POLICY_WEIGHTS).evaluator.kind).toBeUndefined();
  });
});
