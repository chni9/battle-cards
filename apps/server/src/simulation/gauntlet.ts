/**
 * Frozen fitness gauntlet — technical spec v5 §5.2 (L33-03).
 * Fitness is always vs this list, never population-only.
 */

import { HEURISTIC_V4_POLICY_ID } from '../bots/registry';

/** Policy ids that form the absolute progress yardstick. */
export const FROZEN_GAUNTLET_POLICY_IDS = [HEURISTIC_V4_POLICY_ID] as const;

export type GauntletPolicyId = (typeof FROZEN_GAUNTLET_POLICY_IDS)[number];
