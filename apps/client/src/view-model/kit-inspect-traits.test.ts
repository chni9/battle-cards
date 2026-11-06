/**
 * Prophet ability copy: technical spec v7 §10.1 (Lot 76 row), L76-03. The trait-section tests below
 * moved verbatim from the deleted `screens/table/kit-inspect-dialog.test.ts` (spec v7 §12.2; L75-11).
 */
import { CIRCULATING_SPECIAL_CARD_IDS, getKit, type KitTraits } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { KIT_ABILITY_COPY, KIT_TRAIT_SECTION_KEYS } from './kit-inspect-traits';

describe('Prophet ability copy (spec v7 §10.1, L76-03)', () => {
  it('says Prophet starts with 2 random circulating specials, duplicates allowed', () => {
    expect(KIT_ABILITY_COPY.prophet).toMatch(/2 special/i);
    expect(KIT_ABILITY_COPY.prophet).toBe('Starts with 2 special cards drawn at random from the circulating special pool (duplicates allowed).');
  });

  it('names no excluded special while every special circulates (Invisibility is live again, L58-06)', () => {
    expect(CIRCULATING_SPECIAL_CARD_IDS).toContain('invisibility');
    expect(KIT_ABILITY_COPY.prophet).not.toMatch(/excluded/i);
  });
});

describe('kit inspect trait sections (L30-05)', () => {
  it('covers every KitTraits field exactly once', () => {
    // Compile-time: every key is a KitTraits key (satisfies on the export).
    const keys: readonly (keyof KitTraits)[] = KIT_TRAIT_SECTION_KEYS;
    expect(keys).toHaveLength(6);
    expect([...keys].sort()).toEqual(
      ([
        'alwaysUpgraded',
        'immuneTo',
        'allowsMultipleAttacksPerTurn',
        'upgradePointBuyCost',
        'upgradePointSellYield',
        'drawBustDenominator',
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
      getKit('gambler'),
    ] as const;
    expect(kits[0].traits.alwaysUpgraded.length).toBeGreaterThan(0);
    expect(kits[1].traits.immuneTo.length).toBeGreaterThan(0);
    expect(kits[2].traits.allowsMultipleAttacksPerTurn).toBe(true);
    expect(kits[3].traits.upgradePointBuyCost).toBe(5);
    expect(kits[3].traits.upgradePointSellYield).toBe(7);
    expect(kits[4].traits.drawBustDenominator).toBe(10);
  });

  it('documents Ghost, Duplicator, Prophet and Gambler ability copy', () => {
    expect(KIT_ABILITY_COPY.ghost).toMatch(/2 points/i);
    expect(KIT_ABILITY_COPY.duplicator).toMatch(/duplication/i);
    expect(KIT_ABILITY_COPY.prophet).toMatch(/2 special/i);
    expect(KIT_ABILITY_COPY.prophet).toBe('Starts with 2 special cards drawn at random from the circulating special pool (duplicates allowed).');
    expect(KIT_ABILITY_COPY.gambler).toMatch(/1-in-10/i);
    expect(KIT_ABILITY_COPY.gambler).toMatch(/Roulette/i);
    expect(KIT_ABILITY_COPY.gambler).toMatch(/5–100|5-100/);
    expect(KIT_ABILITY_COPY.gambler).toMatch(/weighted/i);
    expect(KIT_ABILITY_COPY.gambler).toMatch(/3 specials/i);
  });
});
