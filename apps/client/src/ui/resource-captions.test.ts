/**
 * Dock resource captions — technical spec v6 §6.1 / L43-01.
 */

import { describe, expect, it } from 'vitest';

import { RESOURCE_CAPTIONS, resourceCaptionMode } from './resource-captions';

describe('resource captions (L43-01 / technical spec v6 §6.1)', () => {
  it('names Lives, Points, Upgrade points, and Shield', () => {
    expect(RESOURCE_CAPTIONS).toEqual({
      life: 'Lives',
      point: 'Points',
      shield: 'Shield',
      upgradePoint: 'Upgrade points',
    });
  });

  it('shows the caption in the layout only when captionVisible is true', () => {
    expect(resourceCaptionMode(true)).toBe('visible');
    expect(resourceCaptionMode(false)).toBe('sr-only');
    expect(resourceCaptionMode(undefined)).toBe('sr-only');
  });
});
