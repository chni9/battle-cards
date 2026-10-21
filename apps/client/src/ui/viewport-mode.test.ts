import { describe, expect, it } from 'vitest';
import { LANDSCAPE_COMPACT_MAX_HEIGHT_PX, viewportModeFor } from './viewport-mode';

describe('viewportModeFor (technical spec v7 §6.4)', () => {
  it.each([
    [844, 390, 'landscape-compact'],
    [1024, 499, 'landscape-compact'],
    [400, 499, 'landscape-compact'],
    [1024, 600, 'desktop'],
    [1440, 900, 'desktop'],
    [900, 500, 'desktop'],
    [768, 1024, 'portrait'],
    [390, 844, 'portrait'],
    [375, 812, 'portrait'],
    [600, 600, 'portrait'],
  ] as const)('%i×%i is %s', (width, height, mode) => {
    expect(viewportModeFor({ width, height })).toBe(mode);
  });

  it('switches to landscape-compact strictly under 500 px of visible height', () => {
    expect(LANDSCAPE_COMPACT_MAX_HEIGHT_PX).toBe(500);
  });
});
