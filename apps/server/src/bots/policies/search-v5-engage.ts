/**
 * Engage search — backlog L40-03 / L40-06.
 * Same ISMCTS as `search-v5`, with `heuristic-v5-engage` as prior, rollout,
 * and sub-choices. Rooms: Normal/Hard use this id after the JAPMZR sell ruling
 * (arena gate still failed; `DEFAULT_POLICY_ID` stays `heuristic-v4`).
 */

import { createHash } from 'node:crypto';

import { scoreEngageActions } from '../score-engage/score-actions';
import { DEFAULT_POLICY_WEIGHTS } from '../policy-weights';
import { computePolicyWeightsHash, stableStringify } from '../weights-hash';
import {
  ENGAGE_OVERLAY_ID,
  heuristicV5EngagePolicy,
} from './heuristic-v5-engage';
import {
  SEARCH_V5_ENGAGE_POLICY_ID,
  createSearchV5Policy,
} from './search-v5';

export { SEARCH_V5_ENGAGE_POLICY_ID };

function computeEngageSearchWeightsHash(): string {
  return createHash('sha256')
    .update(
      stableStringify({
        id: SEARCH_V5_ENGAGE_POLICY_ID,
        rollout: heuristicV5EngagePolicy.id,
        overlay: ENGAGE_OVERLAY_ID,
        weightsHash: computePolicyWeightsHash(DEFAULT_POLICY_WEIGHTS),
      }),
    )
    .digest('hex')
    .slice(0, 16);
}

export const searchV5EngagePolicy = createSearchV5Policy(
  DEFAULT_POLICY_WEIGHTS,
  heuristicV5EngagePolicy,
  {
    id: SEARCH_V5_ENGAGE_POLICY_ID,
    scoreActions: scoreEngageActions,
    weightsHash: computeEngageSearchWeightsHash(),
  },
);
