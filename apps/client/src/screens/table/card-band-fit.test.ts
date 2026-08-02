import { describe, expect, it } from 'vitest';

import {
  faceCardHeight,
  fitCardBand,
  maxWidthForRowHeight,
} from './card-band-fit';

describe('fitCardBand', () => {
  it('never picks a width taller than the row (no crop)', () => {
    const height = 70;
    const fit = fitCardBand(4, 400, height);
    expect(faceCardHeight(fit.cardWidth)).toBeLessThanOrEqual(height + 0.5);
  });

  it('shrinks below preferred min instead of cropping', () => {
    const fit = fitCardBand(6, 300, 55);
    expect(fit.pageSize).toBe(6);
    expect(fit.cardWidth).toBeLessThan(40);
    expect(faceCardHeight(fit.cardWidth)).toBeLessThanOrEqual(55 + 0.5);
  });

  it('fits a small hand on one row when space allows', () => {
    const fit = fitCardBand(4, 400, 140);
    expect(fit.pageSize).toBe(4);
    expect(fit.cardWidth).toBeGreaterThanOrEqual(40);
    expect(fit.cardWidth).toBeLessThanOrEqual(72);
  });

  it('paginates when even tiny faces cannot fit all cards', () => {
    const fit = fitCardBand(30, 100, 50);
    expect(fit.pageSize).toBeLessThan(30);
    expect(faceCardHeight(fit.cardWidth)).toBeLessThanOrEqual(50 + 0.5);
  });
});

describe('maxWidthForRowHeight', () => {
  it('leaves room for the face name line', () => {
    const w = maxWidthForRowHeight(100);
    expect(faceCardHeight(w)).toBeLessThanOrEqual(100 + 0.01);
  });
});
