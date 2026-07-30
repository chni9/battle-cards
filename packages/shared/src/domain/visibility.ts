/**
 * Spy visibility relations — technical spec §5.1, rules spec §3 / §6.
 *
 * Persistent asymmetric who-sees-what-of-whom. Never a boolean on the spied player.
 */

export const SPY_VISIBILITY_LEVELS = ['kit-and-cards', 'full-resources'] as const;

export type SpyVisibilityLevel = (typeof SPY_VISIBILITY_LEVELS)[number];

export interface SpyRelation {
  viewerId: string;
  subjectId: string;
  level: SpyVisibilityLevel;
}
