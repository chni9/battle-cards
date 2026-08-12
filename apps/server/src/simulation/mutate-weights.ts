/**
 * Mutate action-scoring + survival term for (1+λ)-ES — L33-03.
 */

import {
  ACTION_WEIGHT_SCALAR_KEYS,
  BAND_WEIGHT_KEYS,
  parsePolicyWeights,
  type PolicyActionWeights,
  type PolicyBandWeights,
  type PolicyWeights,
} from '../bots/policy-weights';
import type { Rng } from '../engine/rng';

export function mutatePolicyWeights(
  parent: PolicyWeights,
  rng: Rng,
  sigma: number,
): PolicyWeights {
  const bands = { ...parent.action.bands } as {
    -readonly [K in keyof PolicyBandWeights]: number;
  };

  for (const key of BAND_WEIGHT_KEYS) {
    bands[key] =
      bands[key] + gaussian(rng) * sigma * Math.max(1, Math.abs(bands[key]) * 0.05);
  }

  const actionScalars = { ...parent.action } as {
    -readonly [K in keyof PolicyActionWeights]: PolicyActionWeights[K];
  };
  actionScalars.bands = bands;

  for (const key of ACTION_WEIGHT_SCALAR_KEYS) {
    const current = actionScalars[key];
    actionScalars[key] =
      current + gaussian(rng) * sigma * Math.max(0.5, Math.abs(current) * 0.08);
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
