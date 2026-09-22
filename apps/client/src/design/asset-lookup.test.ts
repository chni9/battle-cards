/**
 * Asset lookup coverage — technical spec v2 §4 / v4 §3.1, L30-01.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    expect(KIT_IDS).toHaveLength(16);
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

  it('maps ghost, duplicator and gambler portraits (L28-03 / L63-01)', () => {
    expect(getKitPortraitUrl('ghost')).toMatch(/Ghost\.png/);
    expect(getKitPortraitUrl('duplicator')).toMatch(/Duplicator\.png/);
    expect(getKitPortraitUrl('gambler')).toMatch(/Gambler\.png/);
  });

  it('maps wizard to Magician.png (L27-08)', () => {
    expect(getKitPortraitUrl('wizard')).toMatch(/Magician\.png/);
  });

  it('covers all 31 card ids', () => {
    expect(ALL_ART_CARD_IDS).toHaveLength(31);
    expect(new Set(ALL_ART_CARD_IDS).size).toBe(31);
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

  it('maps Roulette cream/pink faces and copies them onto activated filenames', () => {
    expect(decodeURIComponent(getCardArtUrl('roulette', { isUpgraded: false }))).toMatch(
      /Roulette\.png/,
    );
    expect(decodeURIComponent(getCardArtUrl('roulette', { isUpgraded: true }))).toMatch(
      /Roulette \+\.png/,
    );
    expect(
      decodeURIComponent(getCardArtUrl('roulette', { isUpgraded: false, activated: true })),
    ).toMatch(/Roulette \(activated\)\.png/);
    expect(
      decodeURIComponent(getCardArtUrl('roulette', { isUpgraded: true, activated: true })),
    ).toMatch(/Roulette \+ \(activated\)\.png/);
    expect(CARDS_WITH_ACTIVATED_ART).toContain('roulette');

    const here = dirname(fileURLToPath(import.meta.url));
    const folders = [
      join(here, '../assets/cards'),
      join(process.cwd(), 'images'),
    ] as const;
    for (const folder of folders) {
      const cream = readFileSync(join(folder, 'Roulette.png'));
      const pink = readFileSync(join(folder, 'Roulette +.png'));
      expect(readFileSync(join(folder, 'Roulette (activated).png')).equals(cream)).toBe(true);
      expect(readFileSync(join(folder, 'Roulette + (activated).png')).equals(pink)).toBe(true);
    }
  });

  it('maps cream unupgraded and pink upgraded faces for the 2026-09-21 art drop', () => {
    expect(decodeURIComponent(getCardArtUrl('invisibility', { isUpgraded: false }))).toMatch(
      /Invisibility\.png/,
    );
    expect(decodeURIComponent(getCardArtUrl('invisibility', { isUpgraded: true }))).toMatch(
      /Invisibility \+\.png/,
    );
    expect(decodeURIComponent(getCardArtUrl('points-generator', { isUpgraded: false }))).toMatch(
      /Generator\.png/,
    );
    expect(decodeURIComponent(getCardArtUrl('points-generator', { isUpgraded: true }))).toMatch(
      /Generator \+\.png/,
    );
    expect(decodeURIComponent(getCardArtUrl('sentence', { isUpgraded: false }))).toMatch(
      /Sentence\.png/,
    );
    expect(decodeURIComponent(getCardArtUrl('upgrade-point-thief', { isUpgraded: true }))).toMatch(
      /Upgrade Point Thief \+\.png/,
    );
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
