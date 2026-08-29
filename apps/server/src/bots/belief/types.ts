/**
 * Shared belief types — technical spec v5 §4.2 (L34-02 / L34-03 / L34-05).
 */

import type { KitId } from '@card-battle/shared';

/**
 * Posterior over kits for one opponent seat.
 * Mass sums to 1 over the support; contradicted kits are 0.
 */
export type KitPosterior = Readonly<Record<KitId, number>>;

/** Inclusive integer bounds for one hidden resource. */
export interface ResourceInterval {
  readonly lo: number;
  readonly hi: number;
}

export interface OpponentResourceBelief {
  readonly lives: ResourceInterval;
  readonly points: ResourceInterval;
  readonly upgradePoints: ResourceInterval;
}

export interface HandSizeBelief {
  readonly actionCount: ResourceInterval;
  readonly attackCount: ResourceInterval;
  readonly specialCount: ResourceInterval;
}

export interface BeliefSummary {
  /**
 * Normalized life-interval widths for opponent seat offsets 1..3 (living
 * opponents in seat order relative to perspective). Missing → 0.
 * Fitted layout v1 reserved three slots (Classic was 2–4); a 6-player table
 * still fills only the first three offsets.
 */
  readonly lifeWidthByOpponentOffset: readonly [number, number, number];
}

/**
 * Posteriors and intervals for every opponent seat — no sampling
 * (technical spec v5 §4.2 / L34-05). Resource and hand-size intervals are
 * conditioned on the MAP kit of that seat's posterior.
 */
export interface BeliefState {
  readonly perspectivePlayerId: string;
  readonly kitPosteriorByOpponentId: Readonly<Record<string, KitPosterior>>;
  readonly resourcesByOpponentId: Readonly<Record<string, OpponentResourceBelief>>;
  readonly handSizesByOpponentId: Readonly<Record<string, HandSizeBelief>>;
  readonly summary: BeliefSummary;
}

export function intervalWidth(interval: ResourceInterval): number {
  return interval.hi - interval.lo;
}
