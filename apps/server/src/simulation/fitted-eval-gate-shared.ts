/**
 * Shared constants / weight resolution for L37-04 fitted-eval gate.
 */

import { DEFAULT_POLICY_WEIGHTS, type PolicyWeights } from '../bots/policy-weights';
import { resolveWeightsProfile } from '../bots/profiles/index';
import type { FitMatchup } from './fit-split';
import type { FitnessResult } from './fitness-gauntlet';

export const FITTED_LINEAR_PROFILE_ID = 'search-linear';
export const FITTED_LOGISTIC_PROFILE_ID = 'search-fitted-logistic';

export interface FittedEvalGateInbound {
  readonly type: 'fitted-eval-gate';
  readonly id: number;
  readonly matchups: readonly FitMatchup[];
  readonly linearProfileId: string;
  readonly fittedProfileId: string;
  readonly searchIterations: number;
}

export type FittedEvalGateOutbound =
  | { readonly type: 'result'; readonly id: number; readonly result: FitnessResult }
  | { readonly type: 'error'; readonly id: number; readonly message: string };

export function resolveGateWeights(profileId: string): PolicyWeights {
  if (profileId === FITTED_LINEAR_PROFILE_ID || profileId === 'default') {
    return DEFAULT_POLICY_WEIGHTS;
  }

  return resolveWeightsProfile(profileId);
}
