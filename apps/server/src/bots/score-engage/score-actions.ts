/**
 * Engage overlay on frozen v4 `scoreActions` — backlog L40-02.
 * New files only; `score-play/` stays untouched (L32-03).
 */

import { isAttackCardId, type PlayingStateView } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import type { Rng } from '../../engine/rng';
import {
  scoreActions as scoreV4Actions,
  type ScoredAction,
} from '../heuristic-policy';
import { findOwnCard } from '../policy-internals';
import { DEFAULT_POLICY_WEIGHTS, type PolicyWeights } from '../policy-weights';
import {
  attackDamageOfAction,
  attackTargetIds,
  isAnswerCardId,
  readEngageTable,
  type EngageTable,
} from './table';

function drawScoreOf(
  scored: readonly ScoredAction[],
  weights: PolicyWeights,
): number {
  for (const entry of scored) {
    if (entry.action.type === 'draw') {
      return entry.score;
    }
  }

  return weights.action.bands.sustain;
}

function overlayEntry(
  view: PlayingStateView,
  entry: ScoredAction,
  table: EngageTable,
  scored: readonly ScoredAction[],
  weights: PolicyWeights,
): ScoredAction {
  const { action } = entry;
  const bands = weights.action.bands;
  const hasEngageTarget = table.finishableIds.size > 0 || table.attackerIds.size > 0;

  if (action.type === 'buyUpgradePoint' && table.unusedUpgradePoints > 0) {
    return { action, score: Number.NEGATIVE_INFINITY, code: 'invest' };
  }

  if (action.type === 'buyCard' && isAttackCardId(action.cardId)) {
    // Buy-Basic-to-sell (HWZMWI). Assembling a *big* attack later is still
    // farming; Basic is the shop loop. Super/Mega keep the v4 score.
    if (action.cardId === 'basic-attack') {
      return {
        action,
        score: Math.min(entry.score, drawScoreOf(scored, weights) - 1),
        code: 'invest',
      };
    }
  }

  if (action.type === 'sellCard') {
    const instance = findOwnCard(view, action.instanceId);

    if (instance !== undefined) {
      if (
        isAttackCardId(instance.cardId) &&
        table.attackInstanceIds.length <= 1
      ) {
        return { action, score: Number.NEGATIVE_INFINITY, code: 'sustain' };
      }

      if (
        isAnswerCardId(instance.cardId) &&
        (table.incomingAttackDamage > 0 || hasEngageTarget)
      ) {
        return { action, score: Number.NEGATIVE_INFINITY, code: 'survive' };
      }
    }
  }

  const targets = attackTargetIds(view, action);

  if (targets.length > 0) {
    const hitsFinishable = targets.some((id) => table.finishableIds.has(id));
    const hitsAttacker = targets.some((id) => table.attackerIds.has(id));
    const damage = attackDamageOfAction(view, action);

    if (hitsAttacker) {
      return {
        action,
        score: Math.max(entry.score, bands.pressure + 800 + damage),
        code: 'pressure',
      };
    }

    if (hitsFinishable) {
      return {
        action,
        score: Math.max(entry.score, bands.pressure + 500 + damage),
        code: 'pressure',
      };
    }

    if (hasEngageTarget) {
      return {
        action,
        score: Math.min(entry.score, bands.sustain - 15),
        code: 'pressure',
      };
    }
  }

  return entry;
}

/** Same signature as v4 `scoreActions` so search can inject this scorer (L40-03). */
export function scoreEngageActions(
  view: PlayingStateView,
  actions: readonly TurnAction[],
  rng: Rng,
  weights: PolicyWeights = DEFAULT_POLICY_WEIGHTS,
): readonly ScoredAction[] {
  const scored = scoreV4Actions(view, actions, rng, weights);
  const table = readEngageTable(view);
  return scored.map((entry) => overlayEntry(view, entry, table, scored, weights));
}
