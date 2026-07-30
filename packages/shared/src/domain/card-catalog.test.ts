import { describe, expect, it } from 'vitest';

import { SHARED_CARD_IDS } from './card';
import { getSharedCard, SHARED_CARD_CATALOG } from './card-catalog';

describe('SHARED_CARD_CATALOG (rules spec §1–§3, Lot 2 shop rulings)', () => {
  it('covers every shared card id exactly once', () => {
    expect(Object.keys(SHARED_CARD_CATALOG).sort()).toEqual([...SHARED_CARD_IDS].sort());
  });

  it('prices point cards at 2× / 1× base usage cost', () => {
    expect(SHARED_CARD_CATALOG['basic-attack'].buyCost).toEqual({ points: 2 });
    expect(SHARED_CARD_CATALOG['basic-attack'].sellYield).toEqual({ points: 1 });
    expect(SHARED_CARD_CATALOG['strong-attack'].buyCost).toEqual({ points: 4 });
    expect(SHARED_CARD_CATALOG['super-attack'].buyCost).toEqual({ points: 20 });
    expect(SHARED_CARD_CATALOG.absorber.buyCost).toEqual({ points: 6 });
  });

  it('prices Tax and Regeneration per Lot 2 ruling', () => {
    expect(SHARED_CARD_CATALOG.tax.buyCost).toEqual({ lives: 2 });
    expect(SHARED_CARD_CATALOG.tax.sellYield).toEqual({ lives: 1 });
    expect(SHARED_CARD_CATALOG.regeneration.buyCost).toEqual({ points: 6 });
    expect(SHARED_CARD_CATALOG.regeneration.sellYield).toEqual({ points: 3 });
  });

  it('getSharedCard returns undefined for specials', () => {
    expect(getSharedCard('suicide')).toBeUndefined();
    expect(getSharedCard('basic-attack')?.id).toBe('basic-attack');
  });
});
