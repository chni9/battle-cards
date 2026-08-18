/**
 * Mutate action-scoring + survival term for (1+λ)-ES — L33-03.
 *
 * Band bases stay fixed — mutating lethalNow/survive scale overfits train seeds
 * (observed on L33-04 holdout). Sparse coordinate noise: high-dim full-vector
 * noise overfits tiny train sets without moving holdout.
 */

import {
  ACTION_WEIGHT_SCALAR_KEYS,
  parsePolicyWeights,
  type PolicyActionWeights,
  type PolicyWeights,
} from '../bots/policy-weights';
import type { Rng } from '../engine/rng';

/** How many action scalars to touch per offspring (plus survival). */
const SPARSE_ACTION_MUTATIONS = 6;

export function mutatePolicyWeights(
  parent: PolicyWeights,
  rng: Rng,
  sigma: number,
): PolicyWeights {
  const actionScalars = { ...parent.action, bands: { ...parent.action.bands } } as {
    -readonly [K in keyof PolicyActionWeights]: PolicyActionWeights[K];
  };

  const keys = [...ACTION_WEIGHT_SCALAR_KEYS];
  // Fisher–Yates partial shuffle — first K keys are mutated.
  for (let index = 0; index < Math.min(SPARSE_ACTION_MUTATIONS, keys.length); index += 1) {
    const swapAt = index + rng.nextInt(keys.length - index);
    const currentKey = keys[index];
    const swapKey = keys[swapAt];
    if (currentKey === undefined || swapKey === undefined) {
      continue;
    }
    keys[index] = swapKey;
    keys[swapAt] = currentKey;
  }

  for (let index = 0; index < Math.min(SPARSE_ACTION_MUTATIONS, keys.length); index += 1) {
    const key = keys[index];
    if (key === undefined) {
      continue;
    }
    const current = actionScalars[key];
    actionScalars[key] =
      current + gaussian(rng) * sigma * Math.max(1, Math.abs(current) * 0.2);
  }

  return parsePolicyWeights({
    action: actionScalars,
    lifeThresholds: parent.lifeThresholds,
    evaluator: {
      survivalTermWeight:
        parent.evaluator.survivalTermWeight + gaussian(rng) * sigma * 0.05,
      linearWeights: [...parent.evaluator.linearWeights],
    },
    search: parent.search,
  });
}

/** Box-Muller via two uniform draws from seeded rng. */
function gaussian(rng: Rng): number {
  const u1 = Math.max(1e-12, (rng.nextInt(1_000_000) + 1) / 1_000_001);
  const u2 = (rng.nextInt(1_000_000) + 1) / 1_000_001;
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
