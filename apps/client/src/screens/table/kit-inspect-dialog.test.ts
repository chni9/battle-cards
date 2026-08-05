/**
 * Kit inspect — L27-05 special keys + L30-05 trait section coverage.
 */

import { describe, expect, it } from 'vitest';

import { getKit, type KitTraits } from '@card-battle/shared';

import {
  KIT_ABILITY_COPY,
  KIT_TRAIT_SECTION_KEYS,
} from './kit-inspect-traits';
import { kitSpecialCardKey } from './kit-special-card-key';

describe('kitSpecialCardKey (L27-05)', () => {
  it('disambiguates duplicate special card ids for Specialist', () => {
    const keys = getKit('specialist').specialCards.map((cardId, index) =>
      kitSpecialCardKey(cardId, index),
    );
    expect(keys).toEqual([
      'card-transformer:0',
      'card-transformer:1',
      'card-thief:2',
      'super-absorber:3',
    ]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('kit inspect trait sections (L30-05)', () => {
  it('covers every KitTraits field exactly once', () => {
    // Compile-time: every key is a KitTraits key (satisfies on the export).
    const keys: readonly (keyof KitTraits)[] = KIT_TRAIT_SECTION_KEYS;
    expect(keys).toHaveLength(5);
    expect([...keys].sort()).toEqual(
      ([
        'alwaysUpgraded',
        'immuneTo',
        'allowsMultipleAttacksPerTurn',
        'upgradePointBuyCost',
        'upgradePointSellYield',
      ] as const)
        .slice()
        .sort(),
    );
  });

  it('shows each trait on at least one shipped kit', () => {
    const kits = [
      getKit('scientific'),
      getKit('untouchable'),
      getKit('assassin'),
      getKit('upgrader'),
    ] as const;
    expect(kits[0].traits.alwaysUpgraded.length).toBeGreaterThan(0);
    expect(kits[1].traits.immuneTo.length).toBeGreaterThan(0);
    expect(kits[2].traits.allowsMultipleAttacksPerTurn).toBe(true);
    expect(kits[3].traits.upgradePointBuyCost).toBe(5);
    expect(kits[3].traits.upgradePointSellYield).toBe(7);
  });

  it('documents Ghost, Duplicator and Prophet ability copy', () => {
    expect(KIT_ABILITY_COPY.ghost).toMatch(/2 points/i);
    expect(KIT_ABILITY_COPY.duplicator).toMatch(/duplication/i);
    expect(KIT_ABILITY_COPY.prophet).toMatch(/2 special/i);
  });
});
