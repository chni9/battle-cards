/**
 * Phase A state evaluator — technical spec v5 §5.1 / #V5-7 (L33-02).
 * Sole-survivor win-probability vector over living players (sums to ≈1).
 */

import type { GameState } from '@card-battle/shared';

import {
  DEFAULT_POLICY_WEIGHTS,
  type PolicyWeights,
} from '../policy-weights';
import {
  extractFeatures,
  FEATURE_DIM,
  type FeatureVector,
} from './features';

const SUM_TOLERANCE = 1e-9;

function softmax(logits: readonly number[]): Float64Array {
  if (logits.length === 0) {
    return new Float64Array(0);
  }

  let max = logits[0] ?? 0;

  for (const value of logits) {
    if (value > max) {
      max = value;
    }
  }

  const exps = logits.map((value) => Math.exp(value - max));
  const sum = exps.reduce((acc, value) => acc + value, 0);
  const out = new Float64Array(exps.length);

  for (let index = 0; index < exps.length; index += 1) {
    out[index] = (exps[index] ?? 0) / sum;
  }

  return out;
}

function dot(features: FeatureVector, weights: readonly number[]): number {
  if (weights.length !== FEATURE_DIM && weights.length !== features.length) {
    // Allow empty (pre-L33-02 defaults) → zero logit.
    if (weights.length === 0) {
      return 0;
    }

    throw new Error(
      `linearWeights length ${String(weights.length)} ≠ feature dim ${String(FEATURE_DIM)}`,
    );
  }

  let sum = 0;

  for (let index = 0; index < features.length; index += 1) {
    sum += (features[index] ?? 0) * (weights[index] ?? 0);
  }

  return sum;
}

/**
 * Linear combination over extracted features → logits → softmax over living seats.
 * `#V5-7`: optional survival term (default weight 0) adds `survivalTermWeight * lives/lifeLimit`
 * to each living player's logit before softmax.
 */
export function evaluateFromFeatures(
  state: GameState,
  livingPlayerIds: readonly string[],
  featureByPlayerId: ReadonlyMap<string, FeatureVector>,
  weights: PolicyWeights = DEFAULT_POLICY_WEIGHTS,
): Float64Array {
  const logits = livingPlayerIds.map((playerId) => {
    const features = featureByPlayerId.get(playerId);

    if (features === undefined) {
      throw new Error(`Missing features for ${playerId}`);
    }

    let logit = dot(features, weights.evaluator.linearWeights);
    const survival = weights.evaluator.survivalTermWeight;

    if (survival !== 0) {
      const player = state.players.find((entry) => entry.id === playerId);

      if (player !== undefined) {
        logit += survival * (player.lives / state.lifeLimit);
      }
    }

    return logit;
  });

  return softmax(logits);
}

/**
 * Estimated P(player i is sole survivor) for every living player, in seat order
 * of `state.players` filtered to living. Eliminated seats are omitted.
 */
export function evaluate(
  state: GameState,
  _perspectivePlayerId: string,
  weights: PolicyWeights = DEFAULT_POLICY_WEIGHTS,
): Float64Array {
  void _perspectivePlayerId;
  const living = state.players.filter((player) => !player.isEliminated);
  const featureByPlayerId = new Map<string, FeatureVector>();

  for (const player of living) {
    featureByPlayerId.set(player.id, extractFeatures(state, player.id));
  }

  return evaluateFromFeatures(
    state,
    living.map((player) => player.id),
    featureByPlayerId,
    weights,
  );
}

export function assertWinProbabilitiesNormalized(
  values: Float64Array,
  tolerance = SUM_TOLERANCE,
): void {
  let sum = 0;

  for (const value of values) {
    if (!(value >= 0) || !Number.isFinite(value)) {
      throw new Error(`Non-finite or negative win probability: ${String(value)}`);
    }

    sum += value;
  }

  if (Math.abs(sum - 1) > tolerance) {
    throw new Error(`Win probabilities sum to ${String(sum)}, expected ≈1`);
  }
}
