/**
 * Spy visibility relations — technical spec §5.1, rules spec §3 / §6.
 *
 * Persistent asymmetric who-sees-what-of-whom. Never a boolean on the spied player.
 *
 * Developer ruling 2026-07-30 (evening): Spy "resources" = lives, points, upgrade
 * points, shield. Since Lot 69 every level sees them live; the base level (`kit-and-cards`,
 * a pre-Lot-69 name) no longer reveals kit or cards. The first-grant `resourcesSnapshot` is
 * still frozen server-side but never sent (technical spec v7 §14.1).
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

/**
 * True when Spy+ (or spectator full vision) exposed kit/hand lists on `spied`.
 * Base Spy (Lot 69) may set lives/points/UP/shield only — not card intel.
 */
export function spiedRevealsCards(spied: {
  hand?: readonly unknown[] | undefined;
  specialCards?: readonly unknown[] | undefined;
}): boolean {
  return spied.hand !== undefined || spied.specialCards !== undefined;
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
