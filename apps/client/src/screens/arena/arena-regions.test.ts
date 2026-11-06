/** Arena rows per layout mode: technical spec v7 §6.1, §6.4; Lot 75 plan Appendix A.3 (L75-02). */
import { describe, expect, it } from 'vitest';

import { ARENA_REGIONS, ARENA_ROWS, arenaGridStyle, arenaRowAttributes, arenaRowOf } from './arena-regions';

const MODES = ['portrait', 'landscape-compact', 'desktop'] as const;

describe('arena rows (A.3)', () => {
  it('puts each region in its row for every mode', () => {
    expect(ARENA_ROWS).toEqual(['top', 'ticker', 'arena', 'strip', 'hand', 'dock', 'side']);
    expect(ARENA_REGIONS.map((region) => MODES.map((mode) => arenaRowOf(region, mode)))).toEqual([
      ['top', 'top', 'top'],
      ['ticker', 'top', 'side'],
      ['arena', 'arena', 'arena'],
      ['strip', 'hand', 'strip'],
      ['hand', 'hand', 'hand'],
      ['dock', 'hand', 'hand'],
    ]);
  });

  it('spreads the row as data-arena-row', () => {
    expect(arenaRowAttributes('dock', 'desktop')).toEqual({ 'data-arena-row': 'hand' });
  });

  it('floors the landscape band\'s third column, so an empty dock keeps the ticker, and never sizes it by the ticker line (L75-03)', () => {
    // The strip and the dock size their columns; the hand is the flexible one (`minmax(0, 1fr)`).
    expect(arenaGridStyle('landscape-compact').gridTemplateColumns).toBe('auto minmax(0, 1fr) minmax(10rem, auto)');
  });

  it('names all six regions in every mode grid, so no region loses its area', () => {
    for (const mode of MODES) {
      const names = new Set(arenaGridStyle(mode).gridTemplateAreas.split(/[\s"]+/).filter((name) => name !== ''));
      expect([...names].sort()).toEqual([...ARENA_REGIONS].sort());
    }
  });
});
