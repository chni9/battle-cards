/**
 * Kit details sections — technical spec v7 §6.6.5 (the kit sheet shows every current section)
 * and the L30-05 guard that every `KitTraits` field has a rendered section.
 */

import { describe, expect, it } from 'vitest';
import { KIT_TRAIT_SECTION_KEYS } from '../../view-model/kit-inspect-traits';
import {
  KIT_DETAILS_SECTION_IDS,
  KIT_DETAILS_SECTION_TITLES,
  KIT_TRAIT_SECTION_FOR,
} from './kit-details-sections';

describe('kit details sections (L30-05, spec v7 §6.6.5)', () => {
  it('lists the nine sections in display order', () => {
    expect(KIT_DETAILS_SECTION_IDS).toEqual([
      'starting-resources',
      'starting-hand',
      'special-cards',
      'always-upgraded',
      'immune-to',
      'attacks-per-turn',
      'upgrade-points',
      'draw-risk',
      'ability',
    ]);
  });

  it('reuses the kit inspect titles verbatim', () => {
    expect(KIT_DETAILS_SECTION_IDS.map((id) => KIT_DETAILS_SECTION_TITLES[id])).toEqual([
      'Starting resources',
      'Starting hand',
      'Special cards',
      'Always upgraded',
      'Immune to',
      'Attacks per turn',
      'Upgrade points',
      'Draw risk',
      'Ability',
    ]);
  });

  it('maps every KitTraits key to a rendered section', () => {
    expect(KIT_TRAIT_SECTION_FOR).toEqual({
      alwaysUpgraded: 'always-upgraded',
      immuneTo: 'immune-to',
      allowsMultipleAttacksPerTurn: 'attacks-per-turn',
      upgradePointBuyCost: 'upgrade-points',
      upgradePointSellYield: 'upgrade-points',
      drawBustDenominator: 'draw-risk',
    });
    expect(Object.keys(KIT_TRAIT_SECTION_FOR).sort()).toEqual([...KIT_TRAIT_SECTION_KEYS].sort());
    for (const id of Object.values(KIT_TRAIT_SECTION_FOR)) {
      expect(KIT_DETAILS_SECTION_IDS).toContain(id);
    }
  });
});
