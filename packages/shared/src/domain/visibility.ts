/**
 * Spy visibility relations — technical spec §5.1, rules spec §3 / §6.
 *
 * Persistent asymmetric who-sees-what-of-whom. Never a boolean on the spied player.
 *
 * Developer ruling 2026-07-30 (evening): Spy "resources" = lives, points, upgrade
 * points, shield. Base Spy freezes a full-resource snapshot at resolve; upgraded Spy
 * sees those values live (rules §3 upgrade text).
 */

export const SPY_VISIBILITY_LEVELS = ['kit-and-cards', 'full-resources'] as const;

export type SpyVisibilityLevel = (typeof SPY_VISIBILITY_LEVELS)[number];

/** Resources frozen when Spy first resolves on the victim's turn. */
export interface SpyResourcesSnapshot {
  lives: number;
  points: number;
  upgradePoints: number;
  shield: number;
  /** `GameState.turnSequence` at the moment of resolve. */
  turnSequence: number;
}

export interface SpyRelation {
  viewerId: string;
  subjectId: string;
  level: SpyVisibilityLevel;
  /**
   * Set once when the relation is first granted (base or upgraded).
   * Never updated afterward — resources at first Spy resolve.
   */
  resourcesSnapshot?: SpyResourcesSnapshot;
}
