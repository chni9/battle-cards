/**
 * Tuned V5 heuristic — technical spec v5 §5.2 / backlog L33-05.
 * Checked-in `tuned-v5-one-ply` weights + one-round Phase A re-rank
 * (determinize → apply → greedy opponent turns → evaluate).
 * Yardstick `heuristic-v4` stays frozen.
 */

import { createHash } from 'node:crypto';

import type { BotPolicy, PolicyDecideContext } from '../policy-types';
import { resolveWeightsProfile } from '../profiles/index';
import { stableStringify } from '../weights-hash';
import { createHeuristicPolicy } from './create-heuristic-policy';
import { decideWithOnePlyRerank } from './one-ply-rerank';

export const HEURISTIC_TUNED_V5_POLICY_ID = 'heuristic-tuned-v5';

/** Checked-in profile: default action weights + boosted Phase A linear weights. */
export const HEURISTIC_TUNED_V5_PROFILE_ID = 'tuned-v5-one-ply';

const ONE_PLY_DECIDE_KIND = 'one-round-margin-flip-v1';

const TUNED_WEIGHTS = resolveWeightsProfile(HEURISTIC_TUNED_V5_PROFILE_ID);

function computeTunedV5WeightsHash(): string {
  return createHash('sha256')
    .update(
      stableStringify({
        profileId: HEURISTIC_TUNED_V5_PROFILE_ID,
        weights: TUNED_WEIGHTS,
        decide: ONE_PLY_DECIDE_KIND,
      }),
    )
    .digest('hex')
    .slice(0, 16);
}

const base = createHeuristicPolicy(
  HEURISTIC_TUNED_V5_POLICY_ID,
  TUNED_WEIGHTS,
  { weightsHash: computeTunedV5WeightsHash() },
);

export const heuristicTunedV5Policy: BotPolicy = {
  ...base,
  decide(view, actions, rng, ctx: PolicyDecideContext) {
    return decideWithOnePlyRerank(
      view,
      actions,
      rng,
      TUNED_WEIGHTS,
      heuristicTunedV5Policy,
      ctx.actionLog,
    );
  },
};
