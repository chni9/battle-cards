/**
 * The six arena regions, in DOM order — technical spec v7 §6.1; Lot 74 plan Appendix A.3 and
 * Q60 (every region always renders, with its empty state).
 *
 * Per layout mode (spec v7 §6.4; Lot 75 plan Appendix A.3, L75-02): the regions stay the direct
 * children of `<main>` in `ARENA_REGIONS` order in every mode. A mode changes only `<main>`'s grid
 * template (`arenaGridStyle`) and each region's row (`arenaRowOf`), so no region remounts.
 */

import type { LayoutMode } from '../../view-model/seat-layout';

export const ARENA_REGIONS = ['top-bar', 'ticker', 'arena', 'self-strip', 'hand', 'dock'] as const;

export type ArenaRegion = (typeof ARENA_REGIONS)[number];

/** Spread on a region root: a misspelt region fails typecheck. */
export function arenaRegionAttributes(region: ArenaRegion): { readonly 'data-arena-region': ArenaRegion } {
  return { 'data-arena-region': region };
}

/** The grid rows a region can sit in (plan A.3); `side` is the desktop log column. */
export const ARENA_ROWS = ['top', 'ticker', 'arena', 'strip', 'hand', 'dock', 'side'] as const;

export type ArenaRow = (typeof ARENA_ROWS)[number];

/** Portrait: one column, one row per region (spec v7 §6.1). */
const PORTRAIT_ROWS: Readonly<Record<ArenaRegion, ArenaRow>> = {
  'top-bar': 'top',
  ticker: 'ticker',
  arena: 'arena',
  'self-strip': 'strip',
  hand: 'hand',
  dock: 'dock',
};

/** Landscape-compact: the ticker beside the top bar; the strip, the hand and the dock in one row (§6.4; open-question ruling 6). */
const LANDSCAPE_COMPACT_ROWS: Readonly<Record<ArenaRegion, ArenaRow>> = {
  'top-bar': 'top',
  ticker: 'top',
  arena: 'arena',
  'self-strip': 'hand',
  hand: 'hand',
  dock: 'hand',
};

/** Desktop: the ticker region is the right-hand log column; the dock sits right of the hand (§6.4; open-question ruling 5). */
const DESKTOP_ROWS: Readonly<Record<ArenaRegion, ArenaRow>> = {
  'top-bar': 'top',
  ticker: 'side',
  arena: 'arena',
  'self-strip': 'strip',
  hand: 'hand',
  dock: 'hand',
};

/** The grid row a region sits in for `mode` (plan A.3). */
export function arenaRowOf(region: ArenaRegion, mode: LayoutMode): ArenaRow {
  switch (mode) {
    case 'portrait':
      return PORTRAIT_ROWS[region];
    case 'landscape-compact':
      return LANDSCAPE_COMPACT_ROWS[region];
    case 'desktop':
      return DESKTOP_ROWS[region];
  }
}

/** Spread on a region root beside `arenaRegionAttributes(region)`. */
export function arenaRowAttributes(region: ArenaRegion, mode: LayoutMode): { readonly 'data-arena-row': ArenaRow } {
  return { 'data-arena-row': arenaRowOf(region, mode) };
}

/** `<main>`'s grid for `mode`; every region is one named area (its region id). */
export interface ArenaGridStyle {
  readonly gridTemplateAreas: string;
  readonly gridTemplateColumns: string;
  readonly gridTemplateRows: string;
}

/**
 * Inline, because Tailwind cannot spell quoted area templates (spec v7 §6.4; plan A.3, K11, K12).
 * Desktop has three columns (hand, dock, log): the top bar spans them, the arena and the self strip
 * span the first two, and the `ticker` region is the third column under the top bar.
 */
const ARENA_GRID: Readonly<Record<LayoutMode, ArenaGridStyle>> = {
  portrait: {
    gridTemplateAreas: '"top-bar" "ticker" "arena" "self-strip" "hand" "dock"',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gridTemplateRows: 'auto auto minmax(0, 1fr) auto auto auto',
  },
  'landscape-compact': {
    gridTemplateAreas: '"top-bar top-bar ticker" "arena arena arena" "self-strip hand dock"',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    gridTemplateRows: 'auto minmax(0, 1fr) auto',
  },
  desktop: {
    gridTemplateAreas: '"top-bar top-bar top-bar" "arena arena ticker" "self-strip self-strip ticker" "hand dock ticker"',
    gridTemplateColumns: 'minmax(0, 1fr) auto auto',
    gridTemplateRows: 'auto minmax(0, 1fr) auto auto',
  },
};

export function arenaGridStyle(mode: LayoutMode): ArenaGridStyle {
  return ARENA_GRID[mode];
}

/** `{ gridArea: region }`, spread as a region root's `style` (plan A.3, K11). */
export function arenaAreaStyle(region: ArenaRegion): { readonly gridArea: ArenaRegion } {
  return { gridArea: region };
}
