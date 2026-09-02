/**
 * Engage heuristic — backlog L40-02 / decisions.md 2026-08-18.
 * Overlay on frozen v4 scoring. Do not point `heuristic-v4` at this scorer.
 */

import { createHash } from 'node:crypto';

import type { PlayingStateView } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import type { Rng } from '../../engine/rng';
import type { PolicyDecision } from '../heuristic-policy';
import type { BotPolicy, PolicyDecideContext } from '../policy-types';
import { DEFAULT_POLICY_WEIGHTS, type PolicyWeights } from '../policy-weights';
import { resolveWeightsProfile } from '../profiles/index';
import { scoreEngageActions } from '../score-engage/score-actions';
import { computePolicyWeightsHash, stableStringify } from '../weights-hash';
import { createHeuristicPolicy } from './create-heuristic-policy';

export const HEURISTIC_V5_ENGAGE_POLICY_ID = 'heuristic-v5-engage';

/** Overlay identity — bump if the engage rules change, not the frozen v4 weights. */
export const ENGAGE_OVERLAY_ID = 'farm-to-engage-v4';

function computeEngageWeightsHash(weights: PolicyWeights): string {
  return createHash('sha256')
    .update(
      stableStringify({
        id: HEURISTIC_V5_ENGAGE_POLICY_ID,
        overlay: ENGAGE_OVERLAY_ID,
        weightsHash: computePolicyWeightsHash(weights),
      }),
    )
    .digest('hex')
    .slice(0, 16);
}

export function decideEngage(
  view: PlayingStateView,
  actions: readonly TurnAction[],
  rng: Rng,
  weights: PolicyWeights = DEFAULT_POLICY_WEIGHTS,
): PolicyDecision {
  if (actions.length === 0) {
    throw new RangeError('decideEngage received an empty action list');
  }

  const scored = scoreEngageActions(view, actions, rng, weights);
  let best = scored[0]?.score ?? Number.NEGATIVE_INFINITY;

  for (const entry of scored) {
    if (entry.score > best) {
      best = entry.score;
    }
  }

  const top = scored.filter((entry) => entry.score === best);
  const pick = rng.pick(top);

  return {
    action: pick.action,
    reason: { code: pick.code },
  };
}

const base = createHeuristicPolicy(
  HEURISTIC_V5_ENGAGE_POLICY_ID,
  DEFAULT_POLICY_WEIGHTS,
  { weightsHash: computeEngageWeightsHash(DEFAULT_POLICY_WEIGHTS) },
);

export const heuristicV5EngagePolicy: BotPolicy = {
  ...base,
  decide(view, actions, rng, ctx: PolicyDecideContext) {
    const activeWeights =
      ctx.weightsProfile !== undefined &&
      ctx.weightsProfile !== null &&
      ctx.weightsProfile !== ''
        ? resolveWeightsProfile(ctx.weightsProfile)
        : DEFAULT_POLICY_WEIGHTS;

    return decideEngage(view, actions, rng, activeWeights);
  },
};
