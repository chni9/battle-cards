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
    expect(SHARED_CARD_CATALOG.spy.cost).toEqual({ points: 2 });
    expect(SHARED_CARD_CATALOG.spy.buyCost).toEqual({ points: 4 });
    expect(SHARED_CARD_CATALOG.spy.sellYield).toEqual({ points: 2 });
  });

  it('prices Tax and Regeneration per Lot 2 ruling', () => {
    expect(SHARED_CARD_CATALOG.tax.buyCost).toEqual({ lives: 2 });
    expect(SHARED_CARD_CATALOG.tax.sellYield).toEqual({ lives: 1 });
    expect(SHARED_CARD_CATALOG.regeneration.buyCost).toEqual({ points: 6 });
    expect(SHARED_CARD_CATALOG.regeneration.sellYield).toEqual({ points: 3 });
  });

  it('pins the Lot 68 Absorber+ copy (technical spec v7 §10.5)', () => {
    const absorber = SHARED_CARD_CATALOG.absorber;
    expect(absorber.effect).toBe('Gain the lives the target lost during their last complete turn.');
    expect(absorber.upgradeEffect).toBe(
      'Gain the lives the target lost during their last complete turn, and also capture every point and upgrade point that left them, including sales and thefts; never shield.',
    );
    expect(absorber.upgradeAdds).toBe(
      'Also capture every point and upgrade point that left them, including sales and thefts; never shield.',
    );
    expect(`${absorber.upgradeEffect} ${absorber.upgradeAdds}`).not.toMatch(/actively spent/i);
  });

  it('getSharedCard returns undefined for specials', () => {
    expect(getSharedCard('suicide')).toBeUndefined();
    expect(getSharedCard('basic-attack')?.id).toBe('basic-attack');
  });
});
