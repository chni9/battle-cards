/**
 * Frozen incumbent wrapper — technical spec v5 §7.1 (L32-02 / L32-03 / L33-01).
 * Built from the heuristic factory with default module-constant weights.
 * Yardstick hash stays `computeHeuristicV4WeightsHash` (module exports only).
 * Ignores `ctx.actionLog` so behaviour stays byte-identical.
 */

import { DEFAULT_POLICY_WEIGHTS } from '../policy-weights';
import { computeHeuristicV4WeightsHash } from '../weights-hash';
import { createHeuristicPolicy } from './create-heuristic-policy';

export const HEURISTIC_V4_POLICY_ID = 'heuristic-v4';

export const heuristicV4Policy = createHeuristicPolicy(
  HEURISTIC_V4_POLICY_ID,
  DEFAULT_POLICY_WEIGHTS,
  {
    ignoreActionLog: true,
    weightsHash: computeHeuristicV4WeightsHash(),
  },
);
