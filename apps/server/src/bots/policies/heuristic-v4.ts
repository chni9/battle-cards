/**
 * Frozen incumbent wrapper — technical spec v5 §7.1 (L32-02 / L32-03).
 * Delegates to today's free functions; ignores `ctx.actionLog` so behaviour stays
 * byte-identical until a later policy id consumes the log.
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
import {
  pickPoolInstanceIds,
  pickReanimationKitId,
  pickSpecialCardId,
  pickStealInstanceId,
} from '../sub-choice-picks';
import { computeHeuristicV4WeightsHash } from '../weights-hash';

export const HEURISTIC_V4_POLICY_ID = 'heuristic-v4';

export const heuristicV4Policy: BotPolicy = {
  id: HEURISTIC_V4_POLICY_ID,
  weightsHash: computeHeuristicV4WeightsHash(),
  decide(view, actions, rng, ctx: PolicyDecideContext) {
    void ctx;
    return decideWithReason(view, actions, rng);
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
