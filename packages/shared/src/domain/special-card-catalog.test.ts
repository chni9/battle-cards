import { describe, expect, it } from 'vitest';

import { SPECIAL_CARD_IDS } from './card';
import { getCard } from './card-catalog';
import {
  getSpecialCard,
  isPersistentSpecialCardId,
  SPECIAL_CARD_CATALOG,
} from './special-card-catalog';

describe('SPECIAL_CARD_CATALOG (rules spec §5, L5-01)', () => {
  it('covers every special card id exactly once', () => {
    expect(Object.keys(SPECIAL_CARD_CATALOG).sort()).toEqual([...SPECIAL_CARD_IDS].sort());
  });

  it('lists the ruled play Prices (rules spec §5, re-verified L20-04)', () => {
    expect(SPECIAL_CARD_CATALOG.suicide.cost).toEqual({ points: 3 });
    expect(SPECIAL_CARD_CATALOG['spy-thief'].cost).toEqual({ points: 5 });
    expect(SPECIAL_CARD_CATALOG.imposition.cost).toEqual({ points: 6 });
    expect(SPECIAL_CARD_CATALOG.cloning.cost).toEqual({ points: 3 });
    expect(SPECIAL_CARD_CATALOG.sentence.cost).toEqual({ points: 15 });
    expect(SPECIAL_CARD_CATALOG['points-generator'].cost).toEqual({ points: 5 });
    expect(SPECIAL_CARD_CATALOG['upgrade-point-thief'].cost).toEqual({ points: 5 });
    expect(SPECIAL_CARD_CATALOG.block.cost).toEqual({ points: 5 });
    expect(SPECIAL_CARD_CATALOG['super-regeneration'].cost).toEqual({ points: 6 });
    expect(SPECIAL_CARD_CATALOG['card-thief'].cost).toEqual({ points: 5 });
    expect(SPECIAL_CARD_CATALOG['card-transformer'].cost).toEqual({ points: 2 });
    expect(SPECIAL_CARD_CATALOG.invisibility.cost).toEqual({ points: 10 });
    expect(SPECIAL_CARD_CATALOG.reanimation.cost).toEqual({ points: 8 });
    expect(SPECIAL_CARD_CATALOG['card-absorber'].cost).toEqual({ points: 4 });
    expect(SPECIAL_CARD_CATALOG['mega-attack'].cost).toEqual({ points: 16 });
    expect(SPECIAL_CARD_CATALOG['super-mirror'].cost).toEqual({ points: 7 });
    expect(SPECIAL_CARD_CATALOG['super-absorber'].cost).toEqual({ points: 8 });
    expect(SPECIAL_CARD_CATALOG.curse.cost).toEqual({ points: 8 });
    expect(SPECIAL_CARD_CATALOG.poison.cost).toEqual({ points: 8 });
    expect(SPECIAL_CARD_CATALOG['attack-thief'].cost).toEqual({ points: 8 });
  });

  it('marks only Imposition and Points Generator as persistent-on-play', () => {
    expect(isPersistentSpecialCardId('imposition')).toBe(true);
    expect(isPersistentSpecialCardId('points-generator')).toBe(true);
    expect(isPersistentSpecialCardId('suicide')).toBe(false);
  });

  it('getSpecialCard / getCard resolve specials; getSharedCard path stays separate', () => {
    expect(getSpecialCard('suicide')?.type).toBe('special');
    expect(getCard('suicide')?.cost).toEqual({ points: 3 });
    expect(getCard('basic-attack')?.type).toBe('attack');
    expect(getSpecialCard('basic-attack')).toBeUndefined();
  });
});
