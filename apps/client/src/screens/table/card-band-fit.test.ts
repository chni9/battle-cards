import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CARD_BAND_ABS_MIN_W,
  CARD_BAND_MAX_W,
  cardBandRowHeight,
  cardBandSideBySide,
  faceCardHeight,
  fitCardBand,
  maxWidthForRowHeight,
} from './card-band-fit';

describe('fitCardBand (L53-07)', () => {
  it('never returns a width whose face is taller than the row', () => {
    for (const rowHeight of [48, 64, 80, 120, 200]) {
      const fit = fitCardBand(8, 120, rowHeight);
      expect(faceCardHeight(fit.cardWidth)).toBeLessThanOrEqual(rowHeight + 0.01);
      expect(fit.cardWidth).toBeLessThanOrEqual(CARD_BAND_MAX_W);
    }
  });

  it('shrinks below the preferred min rather than crop a short row', () => {
    const rowHeight = 50;
    const fit = fitCardBand(6, 360, rowHeight);
    expect(fit.cardWidth).toBeLessThan(CARD_BAND_ABS_MIN_W);
    expect(faceCardHeight(fit.cardWidth)).toBeLessThanOrEqual(rowHeight + 0.01);
  });

  it('caps at MAX on a tall wide dock', () => {
    const fit = fitCardBand(4, 500, 400);
    expect(fit.cardWidth).toBe(CARD_BAND_MAX_W);
  });

  it('keeps the live-table cap well below the old 88px dock-filling size', () => {
    expect(CARD_BAND_MAX_W).toBeLessThanOrEqual(48);
    expect(CARD_BAND_ABS_MIN_W).toBeLessThanOrEqual(22);
  });

  it('keeps one width even when cards cannot all fit in the band', () => {
    const fit = fitCardBand(10, 120, 160);
    expect(fit.cardWidth).toBeGreaterThan(1);
    expect(faceCardHeight(fit.cardWidth)).toBeLessThanOrEqual(160 + 0.01);
  });
});

describe('cardBandRowHeight', () => {
  it('splits the band into two face rows when specials are present', () => {
    const withSpecials = cardBandRowHeight(200, 2);
    const emptySpecials = cardBandRowHeight(200, 0);
    expect(emptySpecials).toBeGreaterThan(withSpecials);
    expect(withSpecials).toBeGreaterThan(0);
  });
});

describe('cardBandSideBySide (L53-07)', () => {
  it('sits Hand and Specials side by side when stacked rows would go below the comfort width', () => {
    expect(cardBandSideBySide(80, 2)).toBe(true);
    expect(cardBandSideBySide(400, 2)).toBe(false);
    expect(cardBandSideBySide(80, 0)).toBe(false);
  });
});

describe('CardBand source (L53-07)', () => {
  it('scrolls horizontally in one row instead of wrapping vertically', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'card-band.tsx'),
      'utf8',
    );
    expect(src).toContain('flex-nowrap');
    expect(src).toContain('overflow-x-auto');
    expect(src).not.toContain('overflow-y-auto');
    expect(src).not.toContain('IconButton');
    expect(src).not.toContain('pageSize');
    expect(src).not.toContain('max-h-[50%]');
    expect(src).toContain('cardBandSideBySide');
  });

  it('centers a short packed row (mx-auto + w-max, not justify-start)', () => {
    // `justify-center` on an overflowing flex row clips both sides. Pack to
    // intrinsic width, then `mx-auto` centers; overflow auto-margins collapse
    // and the row scrolls from the start.
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'card-band.tsx'),
      'utf8',
    );
    expect(src).toContain('mx-auto');
    expect(src).toContain('w-max');
    expect(src).not.toMatch(/\bjustify-start\b/);
    expect(src).not.toMatch(/className="[^"]*justify-center/);
  });
});

describe('maxWidthForRowHeight', () => {
  it('leaves room for the face name line', () => {
    const w = maxWidthForRowHeight(100);
    expect(faceCardHeight(w)).toBeLessThanOrEqual(100 + 0.01);
  });
});
