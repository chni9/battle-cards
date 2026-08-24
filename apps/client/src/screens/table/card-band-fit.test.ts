import { describe, expect, it } from 'vitest';

import {
  CARD_BAND_ABS_MIN_W,
  CARD_BAND_MAX_W,
  cardBandPageSizeForWidth,
  cardBandRowsForHeight,
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

  it('shrinks below 48 when height cannot fit a full face (no crop)', () => {
    const fit = fitCardBand(6, 300, 55);
    expect(fit.pageSize).toBe(6);
    expect(fit.cardWidth).toBeLessThan(CARD_BAND_ABS_MIN_W);
    expect(faceCardHeight(fit.cardWidth)).toBeLessThanOrEqual(55 + 0.5);
  });

  it('fits a small hand on one row when the dock is wide', () => {
    const fit = fitCardBand(4, 400, 140);
    expect(fit.pageSize).toBe(4);
    expect(fit.cardWidth).toBeGreaterThanOrEqual(CARD_BAND_ABS_MIN_W);
    expect(fit.cardWidth).toBeLessThanOrEqual(CARD_BAND_MAX_W);
  });

  it('paginates a narrow width rather than shrinking toward 24', () => {
    const fit = fitCardBand(8, 120, 180);
    expect(fit.pageSize).toBeLessThan(8);
    expect(fit.cardWidth).toBeGreaterThanOrEqual(CARD_BAND_ABS_MIN_W - 0.01);
    expect(faceCardHeight(fit.cardWidth)).toBeLessThanOrEqual(180 + 0.5);
  });

  it('paginates when even tiny faces cannot fit all cards', () => {
    const fit = fitCardBand(30, 100, 50);
    expect(fit.pageSize).toBeLessThan(30);
    expect(faceCardHeight(fit.cardWidth)).toBeLessThanOrEqual(50 + 0.5);
  });
});

describe('cardBandPageSizeForWidth (L50-05)', () => {
  it('is determined by width and locked rows, not height', () => {
    const atTwoRows = cardBandPageSizeForWidth(20, 160, 2);
    expect(cardBandPageSizeForWidth(20, 160, 2)).toBe(atTwoRows);
    expect(atTwoRows).toBeLessThan(20);
    expect(cardBandRowsForHeight(80)).toBe(1);
    expect(cardBandRowsForHeight(400)).toBe(2);
    expect(cardBandPageSizeForWidth(20, 160, 1)).toBeLessThan(atTwoRows);
  });
});

describe('maxWidthForRowHeight', () => {
  it('leaves room for the face name line', () => {
    const w = maxWidthForRowHeight(100);
    expect(faceCardHeight(w)).toBeLessThanOrEqual(100 + 0.01);
  });
});
