/**
 * Search policy — technical spec v5 §6 / Lot 35 (L35-07).
 * ISMCTS decide; sub-choice picks delegate to the Lot 33 champion heuristic
 * (`heuristic-v4` while L33-05 is Blocked).
 */

import type {
  CardInstance,
  KitId,
  PlayingStateView,
  SpecialCardId,
} from '@card-battle/shared';

import type { Rng } from '../../engine/rng';
import { runIsmcts } from '../search/ismcts';
import type { ActionScorer } from '../search/priors';
import { OFFLINE_SEARCH_ITERATIONS } from '../search/search-budget';
import type { BotPolicy, PolicyDecideContext } from '../policy-types';
import { DEFAULT_POLICY_WEIGHTS, type PolicyWeights } from '../policy-weights';
import { resolveWeightsProfile } from '../profiles/index';
import { computePolicyWeightsHash } from '../weights-hash';
import { heuristicV4Policy } from './heuristic-v4';

export const SEARCH_V5_POLICY_ID = 'search-v5';
export const SEARCH_V5_ENGAGE_POLICY_ID = 'search-v5-engage';

/** Simulator iteration budget applies to every ISMCTS policy id (L36-01 / L40-03). */
export function usesOfflineSearchBudget(policyId: string): boolean {
  return policyId.startsWith('search-v5');
}

function resolveWeights(ctx: PolicyDecideContext, fallback: PolicyWeights): PolicyWeights {
  if (ctx.weightsProfile !== undefined && ctx.weightsProfile !== null && ctx.weightsProfile !== '') {
    return resolveWeightsProfile(ctx.weightsProfile);
  }

  return fallback;
}

export function createSearchV5Policy(
  weights: PolicyWeights = DEFAULT_POLICY_WEIGHTS,
  rolloutPolicy: BotPolicy = heuristicV4Policy,
  options: {
    readonly id?: string;
    readonly scoreActions?: ActionScorer;
    readonly weightsHash?: string;
  } = {},
): BotPolicy {
  const id = options.id ?? SEARCH_V5_POLICY_ID;
  const weightsHash =
    options.weightsHash ??
    computePolicyWeightsHash(weights);
  const scoreActions = options.scoreActions;

  return {
    id,
    weightsHash,
    decide(view, actions, rng, ctx) {
      const active = resolveWeights(ctx, weights);
      const result = runIsmcts({
        view,
        actionLog: ctx.actionLog,
        legalActions: actions,
        rng,
        weights: active,
        budget: ctx.budget ?? { kind: 'iterations', n: OFFLINE_SEARCH_ITERATIONS },
        rolloutPolicy,
        botId: view.you,
        ...(scoreActions !== undefined ? { scoreActions } : {}),
      });

      return {
        action: result.action,
        reason: { code: 'search-best' },
        searchDiagnostics: {
          iterations: result.iterations,
          actionScores: result.actionScores,
        },
      };
    },
    pickMirrorRedirect(view, rng, eligibleEffectIds) {
      return rolloutPolicy.pickMirrorRedirect(view, rng, eligibleEffectIds);
    },
    pickEliminationRewards(
      view: PlayingStateView,
      availableCards: readonly CardInstance[],
      lifeLimit: number,
      rng: Rng,
    ) {
      return rolloutPolicy.pickEliminationRewards(view, availableCards, lifeLimit, rng);
    },
    pickStealInstanceId(
      view: PlayingStateView,
      eligibleInstanceIds: readonly string[],
      rng: Rng,
    ) {
      return rolloutPolicy.pickStealInstanceId(view, eligibleInstanceIds, rng);
    },
    pickPoolInstanceIds(
      poolCards: readonly CardInstance[],
      eligibleIds: readonly string[],
      maxCount: number,
      rng: Rng,
    ) {
      return rolloutPolicy.pickPoolInstanceIds(poolCards, eligibleIds, maxCount, rng);
    },
    pickSpecialCardId(eligibleCardIds: readonly SpecialCardId[], rng: Rng) {
      return rolloutPolicy.pickSpecialCardId(eligibleCardIds, rng);
    },
    pickReanimationKitId(eligibleKitIds: readonly KitId[], rng: Rng) {
      return rolloutPolicy.pickReanimationKitId(eligibleKitIds, rng);
    },
  };
}

export const searchV5Policy = createSearchV5Policy();
