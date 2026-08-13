/**
 * PUCT action priors from scoreActions — L35-01 scaffold / L35-04 impl.
 * P(a) = softmax(heuristicScore(a) / τ). No second copy of scoring logic.
 */

import type { PlayingStateView } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import type { Rng } from '../../engine/rng';
import type { PolicyWeights } from '../policy-weights';
import type { SearchDecision } from './search-types';

export interface PriorEntry {
  readonly decision: SearchDecision;
  readonly decisionKey: string;
  readonly prior: number;
}

/**
 * @throws until L35-04 wires scoreActions softmax + progressive widening order.
 */
export function buildActionPriors(
  _view: PlayingStateView,
  _actions: readonly TurnAction[],
  _rng: Rng,
  _weights: PolicyWeights,
): readonly PriorEntry[] {
  void _view;
  void _actions;
  void _rng;
  void _weights;
  throw new Error('buildActionPriors: not implemented (L35-04)');
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
