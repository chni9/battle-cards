/**
 * Asset lookup coverage — technical spec v2 §4, L10-03.
 */

import { KIT_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import {
  V1_CARD_IDS,
  getActionLogoUrl,
  getAttackLogoUrl,
  getCardArtUrl,
  getCardBackUrl,
  getKitPortraitUrl,
  getOpponentPlaceholderUrl,
  getResourceIconUrl,
} from './asset-lookup';

describe('asset-lookup (L10-03)', () => {
  it('resolves a portrait for every V1 KitId', () => {
    for (const kitId of KIT_IDS) {
      const url = getKitPortraitUrl(kitId);
      expect(url.length).toBeGreaterThan(0);
      expect(url).not.toMatch(/dead/i);
    }
  });

  it('maps wizard to Magician.png (L27-08)', () => {
    expect(getKitPortraitUrl('wizard')).toMatch(/Magician\.png/);
  });

  it('resolves base and upgraded art for every V1 CardId', () => {
    for (const cardId of V1_CARD_IDS) {
      const base = getCardArtUrl(cardId, { isUpgraded: false });
      const upgraded = getCardArtUrl(cardId, { isUpgraded: true });
      expect(base.length).toBeGreaterThan(0);
      expect(upgraded.length).toBeGreaterThan(0);
      expect(base).not.toEqual(upgraded);
    }
  });

  it('resolves activated art only for imposition and points-generator', () => {
    for (const cardId of ['imposition', 'points-generator'] as const) {
      const base = getCardArtUrl(cardId, { isUpgraded: false, activated: true });
      const upgraded = getCardArtUrl(cardId, { isUpgraded: true, activated: true });
      expect(base).toMatch(/activated/i);
      expect(upgraded).toMatch(/activated/i);
    }

    expect(() => getCardArtUrl('basic-attack', { isUpgraded: false, activated: true })).toThrow(
      /no activated art/,
    );
  });

  it('resolves resource icons, backs, logos, and opponent placeholder', () => {
    expect(getResourceIconUrl('life').length).toBeGreaterThan(0);
    expect(getResourceIconUrl('point').length).toBeGreaterThan(0);
    expect(getResourceIconUrl('shield').length).toBeGreaterThan(0);
    expect(getResourceIconUrl('upgradePoint').length).toBeGreaterThan(0);
    expect(getCardBackUrl('attack').length).toBeGreaterThan(0);
    expect(getCardBackUrl('action').length).toBeGreaterThan(0);
    expect(getCardBackUrl('special').length).toBeGreaterThan(0);
    expect(getCardBackUrl('kit').length).toBeGreaterThan(0);
    expect(getOpponentPlaceholderUrl().length).toBeGreaterThan(0);
    expect(getAttackLogoUrl().length).toBeGreaterThan(0);
    expect(getActionLogoUrl().length).toBeGreaterThan(0);
  });

  it('never references excluded asset names in resolved URLs', () => {
    const urls = [
      ...KIT_IDS.map((id) => getKitPortraitUrl(id)),
      ...V1_CARD_IDS.flatMap((id) => [
        getCardArtUrl(id, { isUpgraded: false }),
        getCardArtUrl(id, { isUpgraded: true }),
      ]),
      getCardArtUrl('imposition', { isUpgraded: false, activated: true }),
      getCardArtUrl('points-generator', { isUpgraded: true, activated: true }),
      getOpponentPlaceholderUrl(),
      getResourceIconUrl('life'),
    ];

    for (const url of urls) {
      expect(url).not.toMatch(/button/i);
      expect(url).not.toMatch(/Draw\.png/);
      expect(url).not.toMatch(/\(dead\)/);
      expect(url).not.toMatch(/MEGA ATTACK/i);
      expect(url).not.toMatch(/Super Mirror/i);
      expect(url).not.toMatch(/Card Absorber/i);
    }
  });
});
