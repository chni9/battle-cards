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
    expect(SPECIAL_CARD_CATALOG['spy-thief'].effect).toMatch(/one living opponent/i);
    expect(SPECIAL_CARD_CATALOG['spy-thief'].effect).toMatch(/kit, cards, and resources/i);
    expect(SPECIAL_CARD_CATALOG['spy-thief'].upgradeEffect).toMatch(/every living opponent/i);
    expect(SPECIAL_CARD_CATALOG['spy-thief'].upgradeEffect).not.toMatch(/doubl/i);
    expect(SPECIAL_CARD_CATALOG['spy-thief'].upgradeAdds).toMatch(/every living opponent/i);
    expect(SPECIAL_CARD_CATALOG['spy-thief'].upgradeAdds).not.toMatch(/doubl/i);
    expect(SPECIAL_CARD_CATALOG.imposition.cost).toEqual({ points: 6 });
    expect(SPECIAL_CARD_CATALOG.cloning.cost).toEqual({ points: 3 });
    expect(SPECIAL_CARD_CATALOG.sentence.cost).toEqual({ points: 20 });
    expect(SPECIAL_CARD_CATALOG.sentence.effect).toMatch(/3 of your later turns/i);
    expect(SPECIAL_CARD_CATALOG.sentence.effect).toMatch(/does not count/i);
    expect(SPECIAL_CARD_CATALOG.sentence.effect).not.toMatch(/Eliminate a randomly drawn/i);
    expect(SPECIAL_CARD_CATALOG.imposition.effect).toMatch(/above 7/i);
    expect(SPECIAL_CARD_CATALOG.imposition.effect).not.toMatch(/life/i);
    expect(SPECIAL_CARD_CATALOG.imposition.upgradeEffect).not.toMatch(/lives/i);
    expect(SPECIAL_CARD_CATALOG['super-absorber'].effect).toMatch(/does not capture past turns/i);
    expect(SPECIAL_CARD_CATALOG['super-absorber'].upgradeEffect).not.toMatch(/doubled/i);
    expect(SPECIAL_CARD_CATALOG['points-generator'].cost).toEqual({ points: 5 });
    expect(SPECIAL_CARD_CATALOG['points-generator'].effect).toContain('3 points per turn');
    expect(SPECIAL_CARD_CATALOG['points-generator'].upgradeEffect).toContain(
      '6 points per turn',
    );
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

  it('pins the Lot 68 Attack Thief and Super Absorber+ copy (technical spec v7 §10.5)', () => {
    const attackThief = SPECIAL_CARD_CATALOG['attack-thief'];
    expect(attackThief.effect).toBe(
      'Block every attack already pending against you, and steal a random attack card from each opponent.',
    );
    expect(attackThief.upgradeEffect).toBe(
      'Block every attack already pending against you, and steal all attack cards from all opponents.',
    );
    expect(attackThief.upgradeAdds).toBe('Steal all attack cards from all opponents, not one random each.');
    expect(`${attackThief.effect} ${attackThief.upgradeEffect}`).not.toMatch(/\bonce\b|charge/i);

    const superAbsorber = SPECIAL_CARD_CATALOG['super-absorber'];
    expect(superAbsorber.effect).toBe(
      'While the counter holds, absorb lives each living opponent lost on their turn. Playing it does not capture past turns.',
    );
    expect(superAbsorber.upgradeEffect).toBe(
      'While the counter holds, absorb lives each living opponent lost on their turn, plus every point and upgrade point that left them, including sales and thefts; never shield. Playing it does not capture past turns.',
    );
    expect(superAbsorber.upgradeAdds).toBe(
      'Also absorb every point and upgrade point that left them, including sales and thefts; never shield.',
    );
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
