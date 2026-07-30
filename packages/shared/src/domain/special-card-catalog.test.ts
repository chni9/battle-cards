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

  it('lists the ruled play Prices', () => {
    expect(SPECIAL_CARD_CATALOG.suicide.cost).toEqual({ points: 3 });
    expect(SPECIAL_CARD_CATALOG['spy-thief'].cost).toEqual({ points: 5 });
    expect(SPECIAL_CARD_CATALOG.imposition.cost).toEqual({ points: 6 });
    expect(SPECIAL_CARD_CATALOG.cloning.cost).toEqual({ points: 3 });
    expect(SPECIAL_CARD_CATALOG.sentence.cost).toEqual({ points: 15 });
    expect(SPECIAL_CARD_CATALOG['points-generator'].cost).toEqual({ points: 5 });
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
