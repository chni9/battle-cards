/**
 * Sync heuristic-v4 decide used when the worker fails — L32-08 fallback chain.
 */

import type {
  ActionLogEntryView,
  PlayingStateView,
} from '@card-battle/shared';

import type { TurnAction } from '../../../engine/turn/perform-action';
import type { Rng } from '../../../engine/rng';
import { HEURISTIC_V4_POLICY_ID, getPolicy } from '../../registry';
import type { PolicyDecision } from '../../policy-types';

export function decideHeuristicV4Sync(
  view: PlayingStateView,
  actions: readonly TurnAction[],
  rng: Rng,
  actionLog: readonly ActionLogEntryView[],
): PolicyDecision {
  return getPolicy(HEURISTIC_V4_POLICY_ID).decide(view, actions, rng, { actionLog });
}
