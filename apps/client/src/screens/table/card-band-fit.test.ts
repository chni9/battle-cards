import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CARD_BAND_ABS_MIN_W,
  CARD_BAND_GAP_PX,
  CARD_BAND_MAX_W,
  faceCardHeight,
  fitCardBand,
  maxWidthForRowHeight,
} from './card-band-fit';

describe('fitCardBand (L53-03)', () => {
  it('never returns a width below 64, even when the band is short', () => {
    const fit = fitCardBand(6, 300);
    expect(fit.cardWidth).toBeGreaterThanOrEqual(CARD_BAND_ABS_MIN_W);
    expect(fit.cardWidth).toBeLessThanOrEqual(CARD_BAND_MAX_W);
  });

  it('grows toward the max on a wide dock with a small hand', () => {
    const fit = fitCardBand(4, 500);
    expect(fit.cardWidth).toBe(CARD_BAND_MAX_W);
  });

  it('stays at or above 64 on a narrow width rather than shrinking toward 24', () => {
    const fit = fitCardBand(8, 120);
    expect(fit.cardWidth).toBeGreaterThanOrEqual(CARD_BAND_ABS_MIN_W);
    expect(fit.cardWidth).toBeLessThanOrEqual(CARD_BAND_MAX_W);
  });

  it('packs at 64 when two floor-width columns fill the band', () => {
    const fit = fitCardBand(10, CARD_BAND_ABS_MIN_W * 2 + CARD_BAND_GAP_PX);
    expect(fit.cardWidth).toBe(CARD_BAND_ABS_MIN_W);
  });
});

describe('CardBand source (L53-03)', () => {
  it('wraps and scrolls instead of paginating', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'card-band.tsx'),
      'utf8',
    );
    expect(src).toContain('flex-wrap');
    expect(src).toContain('overflow-y-auto');
    expect(src).not.toContain('IconButton');
    expect(src).not.toContain('pageSize');
  });
});

describe('maxWidthForRowHeight', () => {
  it('leaves room for the face name line', () => {
    const w = maxWidthForRowHeight(100);
    expect(faceCardHeight(w)).toBeLessThanOrEqual(100 + 0.01);
  });
});
