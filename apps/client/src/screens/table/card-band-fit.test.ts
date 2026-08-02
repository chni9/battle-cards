import { describe, expect, it } from 'vitest';

import { fitCardBand } from './card-band-fit';

describe('fitCardBand', () => {
  it('fits a small hand on one row when width allows', () => {
    const fit = fitCardBand(4, 400, 120);
    expect(fit.pageSize).toBe(4);
    expect(fit.cardWidth).toBeGreaterThanOrEqual(40);
    expect(fit.cardWidth).toBeLessThanOrEqual(72);
  });

  it('uses two rows before paginating when height allows', () => {
    const fit = fitCardBand(8, 200, 160);
    expect(fit.pageSize).toBe(8);
    expect(fit.cardWidth).toBeGreaterThanOrEqual(40);
  });

  it('paginates when cards cannot fit two rows at min width', () => {
    const fit = fitCardBand(20, 120, 80);
    expect(fit.pageSize).toBeLessThan(20);
    expect(fit.cardWidth).toBe(40);
  });
});
