/**
 * PUCT action priors from scoreActions — technical spec v5 §6.3 (L35-04).
 * P(a) = softmax(heuristicScore(a) / τ). No second copy of scoring logic.
 */

import type { PlayingStateView } from '@card-battle/shared';

import type { Rng } from '../../engine/rng';
import type { TurnAction } from '../../engine/turn/perform-action';
import { scoreActions, type ScoredAction } from '../heuristic-policy';
import type { PolicyWeights } from '../policy-weights';
import { searchDecisionKey } from './info-set-key';
import { maxWidenedChildren } from './search-budget';
import type { SearchDecision } from './search-types';

export interface PriorEntry {
  readonly decision: SearchDecision;
  readonly decisionKey: string;
  readonly prior: number;
  readonly score: number;
}

/** Injected action scorer — default is frozen v4 `scoreActions` (L35-04 / L40-03). */
export type ActionScorer = (
  view: PlayingStateView,
  actions: readonly TurnAction[],
  rng: Rng,
  weights: PolicyWeights,
) => readonly ScoredAction[];

export interface BuildPriorOptions {
  readonly uniform?: boolean;
  readonly scoreActions?: ActionScorer;
}

export function softmaxScores(scores: readonly number[], temperature: number): number[] {
  if (scores.length === 0) {
    return [];
  }

  const tau = temperature <= 0 ? 1 : temperature;
  let max = scores[0] ?? 0;

  for (const score of scores) {
    if (score > max) {
      max = score;
    }
  }

  const exps = scores.map((score) => Math.exp((score - max) / tau));
  const sum = exps.reduce((acc, value) => acc + value, 0);
  return exps.map((value) => value / sum);
}

/**
 * Prior-ordered decisions. Main actions use `scoreActions`; sub-choices are uniform.
 * When `uniform` is true, ignore heuristic scores (ablation).
 */
export function buildDecisionPriors(
  decisions: readonly SearchDecision[],
  view: PlayingStateView,
  rng: Rng,
  weights: PolicyWeights,
  options: BuildPriorOptions = {},
): readonly PriorEntry[] {
  if (decisions.length === 0) {
    return [];
  }

  const uniform = options.uniform === true;
  const actionDecisions = decisions.filter(
    (decision): decision is Extract<SearchDecision, { kind: 'action' }> =>
      decision.kind === 'action',
  );
  const allActions = actionDecisions.length === decisions.length;

  if (!allActions || uniform) {
    const prior = 1 / decisions.length;
    return decisions.map((decision) => ({
      decision,
      decisionKey: searchDecisionKey(decision),
      prior,
      score: 0,
    }));
  }

  const actions = actionDecisions.map((decision) => decision.action);

  const scorer = options.scoreActions ?? scoreActions;
  const scored = scorer(view, actions, rng, weights);
  const probs = softmaxScores(
    scored.map((entry) => entry.score),
    weights.search.priorTemperature,
  );

  const entries: PriorEntry[] = scored.map((entry, index) => {
    const decision = decisions[index];

    if (decision === undefined) {
      throw new Error('buildDecisionPriors: decision/score length mismatch');
    }

    return {
      decision,
      decisionKey: searchDecisionKey(decision),
      prior: probs[index] ?? 0,
      score: entry.score,
    };
  });

  return [...entries].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.decisionKey.localeCompare(right.decisionKey);
  });
}

/** TurnAction-only convenience wrapper around buildDecisionPriors. */
export function buildActionPriors(
  view: PlayingStateView,
  actions: readonly TurnAction[],
  rng: Rng,
  weights: PolicyWeights,
  options: BuildPriorOptions = {},
): readonly PriorEntry[] {
  return buildDecisionPriors(
    actions.map((action) => ({ kind: 'action' as const, action })),
    view,
    rng,
    weights,
    options,
  );
}

/**
 * How many prior-ranked children may exist at this visit count (progressive widening).
 */
export function widenedPriorSlice(
  priors: readonly PriorEntry[],
  nodeVisits: number,
): readonly PriorEntry[] {
  const cap = Math.min(priors.length, maxWidenedChildren(Math.max(1, nodeVisits)));
  return priors.slice(0, cap);
}
