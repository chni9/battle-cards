/** Glyph amounts for cost icons — technical spec v7 §6.6.1 (L72-11). */
import { describe, expect, it } from 'vitest';

import { spokenCost, type StructuredCost } from '../structured-cost';
import {
  glyphAmountFromResource,
  glyphAmountIcon,
  spokenGlyphAmount,
  type GlyphAmount,
} from './glyph-amount';

const g = (kind: GlyphAmount['kind'], amount: number): GlyphAmount => ({ kind, amount });

type Row = readonly [GlyphAmount['kind'], number, string, Parameters<typeof spokenGlyphAmount>[1]?];
function expectSpoken(rows: readonly Row[]): void {
  for (const [kind, n, spoken, options] of rows) { expect(spokenGlyphAmount(g(kind, n), options)).toBe(spoken); }
}

describe('glyph-amount (L72-11)', () => {
  it('maps every amount kind to its resource icon', () => {
    const kinds = ['points', 'pointsPerLife', 'lives', 'upgradePoint', 'shield'] as const;
    expect(kinds.map((k) => glyphAmountIcon(g(k, 3)))).toEqual(['point', 'point', 'life', 'upgrade', 'shield']);
  });
  it('turns tokenizer resource kinds into glyph amounts', () => {
    expect((['point', 'life', 'upgradePoint', 'shield'] as const).map((k) => glyphAmountFromResource(k, 4)))
      .toEqual([g('points', 4), g('lives', 4), g('upgradePoint', 4), g('shield', 4)]);
  });
  it('speaks structured costs exactly as spokenCost does', () => {
    const costs = ([['points', 1], ['points', 3], ['lives', 1], ['lives', 4], ['pointsPerLife', 3], ['pointsPerLife', 2],
      ['upgradePoint', 1], ['upgradePoint', 2]] as const).map(([kind, amount]): StructuredCost => ({ kind, amount }));
    for (const cost of costs) {
      expect(spokenGlyphAmount(cost)).toBe(spokenCost(cost, undefined));
      expect(spokenGlyphAmount(cost, { signed: 'cost' })).toBe(spokenCost(cost, undefined, 'cost'));
      expect(spokenGlyphAmount(cost, { signed: 'gain' })).toBe(spokenCost(cost, undefined, 'gain'));
      expect(spokenGlyphAmount(cost, { multiplier: 2 })).toBe(spokenCost(cost, 2));
    }
  });
  it("pins today's spoken strings", () => {
    expectSpoken([['points', 3, '3 pts'], ['points', 1, '1 pt'], ['lives', 4, '4 lives'], ['lives', 1, '1 life'],
      ['upgradePoint', 2, '2 upgrade points'], ['pointsPerLife', 3, '3 pts/life'], ['pointsPerLife', 2, '2 pts/life'],
      ['points', 10, 'minus 10 pts', { signed: 'cost' }], ['points', 4, '2×4 pts', { multiplier: 2 }]]);
  });
  it('speaks shield amounts as shield points, singular and plural', () => {
    expectSpoken([['shield', 4, '4 shield points'], ['shield', 1, '1 shield point'],
      ['shield', 7, 'plus 7 shield points', { signed: 'gain' }], ['shield', 1, 'minus 1 shield point', { signed: 'cost' }],
      ['shield', 4, '2×4 shield points', { multiplier: 2 }], ['shield', 4, '4 shield points', { multiplier: 1 }]]);
  });
});
