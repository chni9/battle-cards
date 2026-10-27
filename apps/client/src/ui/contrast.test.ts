import { describe, expect, it } from 'vitest';
import { contrastRatio as ratio, deltaE2000, relativeLuminance, SEAT_HUE_MIN_DELTA_E, WCAG_AA_LARGE_TEXT, WCAG_AA_TEXT } from './contrast';
import { V7_COLORS as C, V7_SEAT_COLORS } from './palette';

const GROUNDS = ['bg-0', 'bg-1', 'panel', 'panel-2'] as const;
const CTA_FILLS = ['cta', 'cta-2', 'danger'] as const;
const COLORED_TEXT = ['life', 'point', 'upgrade', 'shield', 'threat-attack', 'threat-other', 'mine', 'danger'] as const;

describe('WCAG helper (technical spec v7 §5.1)', () => {
  it('pins the AA thresholds', () => {
    expect([WCAG_AA_TEXT, WCAG_AA_LARGE_TEXT]).toStrictEqual([4.5, 3]);
  });
  it('computes WCAG relative luminance', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 10);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 10);
    expect(relativeLuminance('#808080')).toBeCloseTo(0.2159, 3);
  });
  it('computes symmetric contrast ratios', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 6);
    expect(ratio('#ffffff', '#000000')).toBeCloseTo(21, 6);
    expect(ratio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(ratio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(ratio('#3da9ff', '#3da9ff')).toBeCloseTo(1, 10);
  });
  it('accepts only #rrggbb', () => {
    expect(() => relativeLuminance('red')).toThrow();
    expect(() => relativeLuminance('#fff')).toThrow();
    expect(() => deltaE2000('#ffffff', 'white')).toThrow();
  });
});
describe('CIEDE2000 (seat-hue metric recorded in DESIGN.md)', () => {
  it('is zero for one color and symmetric', () => {
    expect(deltaE2000('#7cc4ff', '#7cc4ff')).toBeCloseTo(0, 10);
    expect(deltaE2000('#ff0000', '#00ff00')).toBeCloseTo(deltaE2000('#00ff00', '#ff0000'), 10);
  });
  it('matches reference distances', () => {
    expect(deltaE2000('#000000', '#ffffff')).toBeCloseTo(100, 1);
    expect(deltaE2000('#ff0000', '#00ff00')).toBeCloseTo(86.61, 1);
    expect(deltaE2000('#0000ff', '#ffff00')).toBeCloseTo(103.43, 1);
  });
});
describe('V7 token contrast (technical spec v7 §5.1, §5.2)', () => {
  it.each(GROUNDS)('--text and --text-2 reach AA on --%s', (g) => {
    expect(ratio(C.text, C[g])).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    expect(ratio(C['text-2'], C[g])).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
  it('--text-on-card reaches AA on both card-face stops', () => {
    expect(ratio(C['text-on-card'], C['card-face-0'])).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    expect(ratio(C['text-on-card'], C['card-face-1'])).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
  it.each(GROUNDS)('every seat hue reaches AA on --%s (seat names are text)', (g) => {
    V7_SEAT_COLORS.forEach((hue, i) => {
      expect(ratio(hue, C[g]), `--seat-${i}`).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    });
  });
  it('seat hues are pairwise at least SEAT_HUE_MIN_DELTA_E apart (CIEDE2000)', () => {
    expect(SEAT_HUE_MIN_DELTA_E).toBe(20);
    V7_SEAT_COLORS.forEach((a, i) => {
      V7_SEAT_COLORS.slice(i + 1).forEach((b, o) => {
        expect(deltaE2000(a, b), `--seat-${i} vs --seat-${i + o + 1}`).toBeGreaterThanOrEqual(SEAT_HUE_MIN_DELTA_E);
      });
    });
  });
  it.each(CTA_FILLS)('--text-on-cta labels reach AA on --%s', (fill) => {
    expect(ratio(C['text-on-cta'], C[fill])).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
  it.each(COLORED_TEXT)('--%s as text: AA on bg-0, bg-1 and panel; large-text AA on panel-2', (t) => {
    for (const g of ['bg-0', 'bg-1', 'panel'] as const) {
      expect(ratio(C[t], C[g]), `on --${g}`).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    }
    expect(ratio(C[t], C['panel-2'])).toBeGreaterThanOrEqual(WCAG_AA_LARGE_TEXT);
  });
});
