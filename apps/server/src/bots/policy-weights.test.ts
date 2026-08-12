/**
 * PolicyWeights defaults and profile loading — L33-01.
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_POLICY_WEIGHTS,
  defaultPolicyWeights,
  parsePolicyWeights,
} from './policy-weights';
import {
  DEFAULT_WEIGHTS_PROFILE_ID,
  resolveWeightsProfile,
} from './profiles/index';
import {
  computeHeuristicV4WeightsHash,
  computePolicyWeightsHash,
} from './weights-hash';
import { BUY_SPECIAL_POINTS_FLOOR, HEURISTIC_BAND_WEIGHTS } from './heuristic-weights';
import { REFERENCE_STARTING_LIVES } from './heuristic-life-thresholds';

describe('PolicyWeights (L33-01)', () => {
  it('default profile is byte-identical to module constants', () => {
    const weights = defaultPolicyWeights();
    expect(weights.action.bands).toEqual({ ...HEURISTIC_BAND_WEIGHTS });
    expect(weights.action.buySpecialPointsFloor).toBe(BUY_SPECIAL_POINTS_FLOOR);
    expect(weights.lifeThresholds.referenceStartingLives).toBe(REFERENCE_STARTING_LIVES);
    expect(weights.evaluator.survivalTermWeight).toBe(0);
    expect(weights.search.depthCapRounds).toBe(2);
  });

  it('checked-in default.json round-trips through parsePolicyWeights', () => {
    const loaded = resolveWeightsProfile(DEFAULT_WEIGHTS_PROFILE_ID);
    expect(loaded).toEqual(DEFAULT_POLICY_WEIGHTS);
    expect(computePolicyWeightsHash(loaded)).toBe(
      computePolicyWeightsHash(DEFAULT_POLICY_WEIGHTS),
    );
  });

  it('null profile id resolves to DEFAULT_POLICY_WEIGHTS', () => {
    expect(resolveWeightsProfile(null)).toBe(DEFAULT_POLICY_WEIGHTS);
  });

  it('rejects unknown root keys', () => {
    expect(() =>
      parsePolicyWeights({
        ...DEFAULT_POLICY_WEIGHTS,
        extra: 1,
      }),
    ).toThrow(/Unknown PolicyWeights key/);
  });

  it('heuristic-v4 yardstick hash is unchanged (module-export hash)', () => {
    expect(computeHeuristicV4WeightsHash()).toBe('d585586e0c8f7711');
  });
});
