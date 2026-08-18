/**
 * Softmax sampling over search action scores — technical spec v5 §9 / #V5-3 (L36-03).
 * Used for Normal difficulty only. Easy keeps uniform `difficulty-noise.ts`.
 */

import type { Rng } from '../engine/rng';
import type { TurnAction } from '../engine/turn/perform-action';
import type { SearchActionScore } from './search/worker/types';

/** Mild temperature — higher → closer to uniform; lower → closer to greedy. */
export const NORMAL_SOFTMAX_TEMPERATURE = 1.5;

function actionKey(action: TurnAction): string {
  return JSON.stringify(action);
}

/**
 * Sample an action with P(a) ∝ exp(score / τ). Missing scores get 0.
 * Falls back to the search's returned action when scores are empty.
 */
export function sampleSoftmaxAction(
  preferred: TurnAction,
  legalActions: readonly TurnAction[],
  scores: readonly SearchActionScore[] | undefined,
  rng: Rng,
  temperature: number = NORMAL_SOFTMAX_TEMPERATURE,
): TurnAction {
  if (legalActions.length === 0) {
    return preferred;
  }

  if (scores === undefined || scores.length === 0 || temperature <= 0) {
    return preferred;
  }

  const scoreByKey = new Map<string, number>();

  for (const entry of scores) {
    scoreByKey.set(actionKey(entry.action), entry.score);
  }

  const logits = legalActions.map((action) => {
    const score = scoreByKey.get(actionKey(action)) ?? 0;
    return score / temperature;
  });
  const maxLogit = Math.max(...logits);
  const weights = logits.map((logit) => Math.exp(logit - maxLogit));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  if (!(total > 0) || !Number.isFinite(total)) {
    return preferred;
  }

  let cursor = (rng.nextInt(1_000_000) / 1_000_000) * total;

  for (let index = 0; index < legalActions.length; index += 1) {
    const weight = weights[index] ?? 0;
    cursor -= weight;

    if (cursor <= 0) {
      const picked = legalActions[index];

      if (picked !== undefined) {
        return picked;
      }
    }
  }

  return legalActions[legalActions.length - 1] ?? preferred;
}
