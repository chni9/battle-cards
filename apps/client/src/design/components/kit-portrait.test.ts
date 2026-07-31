/**
 * KitPortrait elimination treatment — L10-05.
 * Ensures no dead-asset filenames appear in resolved portrait URLs.
 */

import { KIT_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { getKitPortraitUrl, getOpponentPlaceholderUrl } from '../asset-lookup';

describe('KitPortrait asset sources (L10-05)', () => {
  it('kit and placeholder URLs never reference per-kit dead art', () => {
    const urls = [...KIT_IDS.map((id) => getKitPortraitUrl(id)), getOpponentPlaceholderUrl()];
    for (const url of urls) {
      expect(url).not.toMatch(/\(dead\)/i);
    }
  });
});
