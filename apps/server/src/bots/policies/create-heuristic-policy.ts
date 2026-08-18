/**
 * Heuristic policy factory — technical spec v5 §5.2 (L33-01).
 * Closes over `PolicyWeights` so the registry can host default and tuned profiles
 * without polluting call sites with free-function imports.
 */

import type {
  CardInstance,
  KitId,
  PlayingStateView,
  SpecialCardId,
} from '@card-battle/shared';

import type { Rng } from '../../engine/rng';
import {
  decideWithReason,
  pickEliminationRewardsWithReason,
  pickMirrorRedirect,
} from '../heuristic-policy';
import type { BotPolicy, PolicyDecideContext } from '../policy-types';
import type { PolicyWeights } from '../policy-weights';
import { resolveWeightsProfile } from '../profiles/index';
import {
  pickPoolInstanceIds,
  pickReanimationKitId,
  pickSpecialCardId,
  pickStealInstanceId,
} from '../sub-choice-picks';
import { computePolicyWeightsHash } from '../weights-hash';

export function createHeuristicPolicy(
  id: string,
  weights: PolicyWeights,
  options?: { readonly ignoreActionLog?: boolean; readonly weightsHash?: string },
): BotPolicy {
  const ignoreActionLog = options?.ignoreActionLog ?? false;
  const weightsHash = options?.weightsHash ?? computePolicyWeightsHash(weights);

  return {
    id,
    weightsHash,
    decide(view, actions, rng, ctx: PolicyDecideContext) {
      if (ignoreActionLog) {
        void ctx.actionLog;
      }

      const activeWeights =
        ctx.weightsProfile !== undefined &&
        ctx.weightsProfile !== null &&
        ctx.weightsProfile !== ''
          ? resolveWeightsProfile(ctx.weightsProfile)
          : weights;

      return decideWithReason(view, actions, rng, activeWeights);
    },
    pickMirrorRedirect(
      view: PlayingStateView,
      rng: Rng,
      eligibleEffectIds?: readonly string[],
    ) {
      return pickMirrorRedirect(view, rng, eligibleEffectIds);
    },
    pickEliminationRewards(
      view: PlayingStateView,
      availableCards: readonly CardInstance[],
      lifeLimit: number,
      rng: Rng,
    ) {
      return pickEliminationRewardsWithReason(view, availableCards, lifeLimit, rng);
    },
    pickStealInstanceId(
      view: PlayingStateView,
      eligibleInstanceIds: readonly string[],
      rng: Rng,
    ) {
      return pickStealInstanceId(view, eligibleInstanceIds, rng);
    },
    pickPoolInstanceIds(
      poolCards: readonly CardInstance[],
      eligibleIds: readonly string[],
      maxCount: number,
      rng: Rng,
    ) {
      return pickPoolInstanceIds(poolCards, eligibleIds, maxCount, rng);
    },
    pickSpecialCardId(eligibleCardIds: readonly SpecialCardId[], rng: Rng) {
      return pickSpecialCardId(eligibleCardIds, rng);
    },
    pickReanimationKitId(eligibleKitIds: readonly KitId[], rng: Rng) {
      return pickReanimationKitId(eligibleKitIds, rng);
    },
  };
}
