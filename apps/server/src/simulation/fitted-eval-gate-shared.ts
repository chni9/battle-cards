/**
 * Shared constants / weight resolution for L37-04 fitted-eval gate.
 */

import { heuristicV4Policy } from '../bots/policies/heuristic-v4';
import { heuristicV5EngagePolicy } from '../bots/policies/heuristic-v5-engage';
import { createSearchV5Policy } from '../bots/policies/search-v5';
import type { BotPolicy } from '../bots/policy-types';
import { DEFAULT_POLICY_WEIGHTS, type PolicyWeights } from '../bots/policy-weights';
import { resolveWeightsProfile } from '../bots/profiles/index';
import { scoreEngageActions } from '../bots/score-engage/score-actions';
import type { FitMatchup } from './fit-split';
import type { FitnessResult } from './fitness-gauntlet';

export const FITTED_LINEAR_PROFILE_ID = 'search-linear';
export const FITTED_LOGISTIC_PROFILE_ID = 'search-fitted-logistic';
export const ENGAGE_FITTED_LOGISTIC_PROFILE_ID = 'search-engage-fitted-logistic';

export type FittedSearchPrior = 'v4' | 'engage';

export interface FittedEvalGateInbound {
  readonly type: 'fitted-eval-gate';
  readonly id: number;
  readonly matchups: readonly FitMatchup[];
  readonly linearProfileId: string;
  readonly fittedProfileId: string;
  readonly searchIterations: number;
  readonly prior: FittedSearchPrior;
  /** Override `MAX_TURNS` (L40-04 stall bound). Omitted → 2500. */
  readonly maxTurns?: number;
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

export function parseFittedSearchPrior(raw: string | undefined): FittedSearchPrior {
  if (raw === undefined || raw === '' || raw === 'v4') {
    return 'v4';
  }

  if (raw === 'engage') {
    return 'engage';
  }

  throw new Error('--prior must be v4 or engage');
}

/** Search pair for the fitted-eval gate — same ISMCTS, injected prior/rollout (L40-04). */
export function createFittedGatePolicies(
  linearProfileId: string,
  fittedProfileId: string,
  prior: FittedSearchPrior,
): { readonly linear: BotPolicy; readonly fitted: BotPolicy } {
  if (prior === 'engage') {
    return {
      linear: createSearchV5Policy(
        resolveGateWeights(linearProfileId),
        heuristicV5EngagePolicy,
        { id: 'search-v5-engage-linear', scoreActions: scoreEngageActions },
      ),
      fitted: createSearchV5Policy(
        resolveGateWeights(fittedProfileId),
        heuristicV5EngagePolicy,
        { id: 'search-v5-engage-fitted', scoreActions: scoreEngageActions },
      ),
    };
  }

  return {
    linear: createSearchV5Policy(resolveGateWeights(linearProfileId), heuristicV4Policy, {
      id: 'search-v5-linear',
    }),
    fitted: createSearchV5Policy(resolveGateWeights(fittedProfileId), heuristicV4Policy, {
      id: 'search-v5-fitted',
    }),
  };
}
