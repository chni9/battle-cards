/**
 * Engage search — backlog L40-03.
 * Same ISMCTS as `search-v5`, with `heuristic-v5-engage` as prior, rollout,
 * and sub-choices. Rooms stay on `search-v5` until L40-05.
 */

import { createHash } from 'node:crypto';

import { scoreEngageActions } from '../score-engage/score-actions';
import { DEFAULT_POLICY_WEIGHTS } from '../policy-weights';
import { computePolicyWeightsHash, stableStringify } from '../weights-hash';
import { heuristicV5EngagePolicy } from './heuristic-v5-engage';
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
        overlay: 'farm-to-engage-v1',
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
