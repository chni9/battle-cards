/**
 * Search iteration / depth budget helpers — technical spec v5 §6.4 / §8.2 (L35-01).
 *
 * Default iteration count cites L32-05 (~2.5×10³ truncated playouts/s): 400 ≈ 160 ms
 * on the mid-game bench fixture. Room wall-clock budgets stay Lot 36.
 */

import type { SearchBudget } from './worker/types';

/** Offline / pre-L36 default — cite L32-05 in decisions.md (#V5-1 / L35-01). */
export const OFFLINE_SEARCH_ITERATIONS = 400;

/** Hard floor — delayed resolution needs two full rounds visible (tech §6.4). */
export const DEPTH_CAP_ROUNDS_FLOOR = 2;

/** Progressive widening — module constants until promoted into PolicyWeights. */
export const WIDENING_C = 1;
export const WIDENING_ALPHA = 0.5;

export function resolveIterationBudget(budget: SearchBudget | undefined): number {
  if (budget === undefined) {
    return OFFLINE_SEARCH_ITERATIONS;
  }

  if (budget.kind === 'iterations') {
    return budget.n;
  }

  // Wall-clock is Lot 36 — until then map ms to a conservative iteration guess
  // from L32-05 (~2.5 playouts/ms). Never unbounded.
  return Math.max(1, Math.min(OFFLINE_SEARCH_ITERATIONS, Math.floor(budget.ms * 2.5)));
}

/**
 * Depth cap must never fall below two complete rounds.
 * @throws if `depthCapRounds < DEPTH_CAP_ROUNDS_FLOOR`
 */
export function assertDepthCapRounds(depthCapRounds: number): number {
  if (depthCapRounds < DEPTH_CAP_ROUNDS_FLOOR) {
    throw new Error(
      `search depthCapRounds ${String(depthCapRounds)} < floor ${String(DEPTH_CAP_ROUNDS_FLOOR)}`,
    );
  }

  return depthCapRounds;
}

export function maxWidenedChildren(nodeVisits: number): number {
  return Math.max(1, Math.floor(WIDENING_C * nodeVisits ** WIDENING_ALPHA));
}
