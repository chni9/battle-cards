/**
 * Spy visibility relations — technical spec §5.1, rules spec §3 / §6.
 *
 * Persistent asymmetric who-sees-what-of-whom. Never a boolean on the spied player.
 *
 * Developer ruling 2026-07-30 (Spy tokens): "tokens" means **points** only.
 * Base Spy freezes a points snapshot at resolve; upgraded Spy sees live points.
 */

export const SPY_VISIBILITY_LEVELS = ['kit-and-cards', 'full-resources'] as const;

export type SpyVisibilityLevel = (typeof SPY_VISIBILITY_LEVELS)[number];

/** Points frozen when base Spy resolves on the victim's turn. */
export interface SpyPointsSnapshot {
  points: number;
  /** `GameState.turnSequence` at the moment of resolve. */
  turnSequence: number;
}

export interface SpyRelation {
  viewerId: string;
  subjectId: string;
  level: SpyVisibilityLevel;
  /**
   * Set once when the relation is first granted (base or upgraded).
   * Never updated afterward — always the points at first Spy resolve.
   */
  pointsSnapshot?: SpyPointsSnapshot;
}
