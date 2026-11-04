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

  it('names all six regions in every mode grid, so no region loses its area', () => {
    for (const mode of MODES) {
      const names = new Set(arenaGridStyle(mode).gridTemplateAreas.split(/[\s"]+/).filter((name) => name !== ''));
      expect([...names].sort()).toEqual([...ARENA_REGIONS].sort());
    }
  });
});
