/**
 * Asset lookup coverage — technical spec v2 §4 / v4 §3.1, L30-01.
 */

import { KIT_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import {
  ALL_ART_CARD_IDS,
  CARDS_WITH_ACTIVATED_ART,
  getActionLogoUrl,
  getAttackLogoUrl,
  getCardArtUrl,
  getCardBackUrl,
  getKitPortraitUrl,
  getOpponentPlaceholderUrl,
  getResourceIconUrl,
} from './asset-lookup';

describe('asset-lookup (L30-01)', () => {
  it('resolves a portrait for every KitId', () => {
    expect(KIT_IDS).toHaveLength(15);
    for (const kitId of KIT_IDS) {
      const url = getKitPortraitUrl(kitId);
      expect(url.length).toBeGreaterThan(0);
      expect(url).not.toMatch(/dead/i);
    }
  });

  it('maps Lot 27 remaining kit portraits', () => {
    expect(getKitPortraitUrl('upgrader')).toMatch(/Upgrader\.png/);
    expect(getKitPortraitUrl('tactician')).toMatch(/Tactician\.png/);
    expect(getKitPortraitUrl('prophet')).toMatch(/Prophet\.png/);
    expect(getKitPortraitUrl('warrior')).toMatch(/Warrior\.png/);
  });

  it('maps ghost and duplicator portraits (L28-03)', () => {
    expect(getKitPortraitUrl('ghost')).toMatch(/Ghost\.png/);
    expect(getKitPortraitUrl('duplicator')).toMatch(/Duplicator\.png/);
  });

  it('maps wizard to Magician.png (L27-08)', () => {
    expect(getKitPortraitUrl('wizard')).toMatch(/Magician\.png/);
  });

  it('covers all 30 card ids', () => {
    expect(ALL_ART_CARD_IDS).toHaveLength(30);
    expect(new Set(ALL_ART_CARD_IDS).size).toBe(30);
  });

  it('resolves base and upgraded art for every CardId', () => {
    for (const cardId of ALL_ART_CARD_IDS) {
      const base = getCardArtUrl(cardId, { isUpgraded: false });
      const upgraded = getCardArtUrl(cardId, { isUpgraded: true });
      expect(base.length).toBeGreaterThan(0);
      expect(upgraded.length).toBeGreaterThan(0);
      expect(base).not.toEqual(upgraded);
    }
  });

  it('resolves MEGA ATTACK, Super Mirror and Card Absorber art', () => {
    expect(decodeURIComponent(getCardArtUrl('mega-attack', { isUpgraded: false }))).toMatch(
      /MEGA ATTACK/i,
    );
    expect(decodeURIComponent(getCardArtUrl('mega-attack', { isUpgraded: true }))).toMatch(
      /MEGA ATTACK/i,
    );
    expect(decodeURIComponent(getCardArtUrl('super-mirror', { isUpgraded: false }))).toMatch(
      /Super Mirror/i,
    );
    expect(decodeURIComponent(getCardArtUrl('card-absorber', { isUpgraded: false }))).toMatch(
      /Card Absorber/i,
    );
  });

  it('resolves activated art for every persistent that has it', () => {
    for (const cardId of CARDS_WITH_ACTIVATED_ART) {
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
      ...ALL_ART_CARD_IDS.flatMap((id) => [
        getCardArtUrl(id, { isUpgraded: false }),
        getCardArtUrl(id, { isUpgraded: true }),
      ]),
      ...CARDS_WITH_ACTIVATED_ART.flatMap((id) => [
        getCardArtUrl(id, { isUpgraded: false, activated: true }),
        getCardArtUrl(id, { isUpgraded: true, activated: true }),
      ]),
      getOpponentPlaceholderUrl(),
      getResourceIconUrl('life'),
    ];

    for (const url of urls) {
      expect(url).not.toMatch(/button/i);
      expect(url).not.toMatch(/Draw\.png/);
      expect(url).not.toMatch(/\(dead\)/);
    }
  });
});
