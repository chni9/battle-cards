/**
 * The six arena regions, top to bottom — technical spec v7 §6.1; Lot 74 plan Appendix A.3 and
 * Q60 (every region always renders, with its empty state).
 */

export const ARENA_REGIONS = ['top-bar', 'ticker', 'arena', 'self-strip', 'hand', 'dock'] as const;

export type ArenaRegion = (typeof ARENA_REGIONS)[number];

/** Spread on a region root: a misspelt region fails typecheck. */
export function arenaRegionAttributes(region: ArenaRegion): { readonly 'data-arena-region': ArenaRegion } {
  return { 'data-arena-region': region };
}
