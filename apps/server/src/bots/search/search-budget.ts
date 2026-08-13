/**
 * Search iteration / depth budget helpers — technical spec v5 §6.4 / §8.2 (L35-01, L36-01).
 *
 * Default iteration count cites L32-05 (~2.5×10³ truncated playouts/s): 400 ≈ 160 ms
 * on the mid-game bench fixture. Room uses wall-clock with a per-iteration clock check.
 */

import type { SearchBudget } from './worker/types';

/** Offline / simulator default — cite L32-05 in decisions.md (#V5-1 / L35-01). */
export const OFFLINE_SEARCH_ITERATIONS = 64;

/**
 * Safety cap for wall-clock searches (L32-05 ≈ 2.5 playouts/ms; 10× is headroom).
 * Prevents a stuck clock from spinning forever.
 */
export const WALL_CLOCK_PLAYOUTS_PER_MS = 10;

/** Hard floor — delayed resolution needs two full rounds visible (tech §6.4). */
export const DEPTH_CAP_ROUNDS_FLOOR = 2;

/** Progressive widening — module constants until promoted into PolicyWeights. */
export const WIDENING_C = 1;
export const WIDENING_ALPHA = 0.5;

export type ResolvedSearchLoop =
  | { readonly mode: 'iterations'; readonly n: number }
  | {
      readonly mode: 'wall-clock';
      readonly deadlineMs: number;
      readonly safetyMaxIterations: number;
    };

/**
 * Resolve how `runIsmcts` should stop. Iteration budgets are exact.
 * Wall-clock budgets stop on elapsed time (with a safety iteration cap).
 */
export function resolveSearchLoop(
  budget: SearchBudget | undefined,
  nowMs: number,
): ResolvedSearchLoop {
  if (budget === undefined) {
    return { mode: 'iterations', n: OFFLINE_SEARCH_ITERATIONS };
  }

  if (budget.kind === 'iterations') {
    return { mode: 'iterations', n: budget.n };
  }

  return {
    mode: 'wall-clock',
    deadlineMs: nowMs + budget.ms,
    safetyMaxIterations: Math.max(1, Math.floor(budget.ms * WALL_CLOCK_PLAYOUTS_PER_MS)),
  };
}

/** Exact iteration count for offline / tests. Wall-clock → safety cap only. */
export function resolveIterationBudget(budget: SearchBudget | undefined): number {
  if (budget === undefined) {
    return OFFLINE_SEARCH_ITERATIONS;
  }

  if (budget.kind === 'iterations') {
    return budget.n;
  }

  return Math.max(1, Math.floor(budget.ms * WALL_CLOCK_PLAYOUTS_PER_MS));
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
