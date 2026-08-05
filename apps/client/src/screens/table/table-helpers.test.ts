import { describe, expect, it } from 'vitest';

import {
  cardIsSelfOnlyPlay,
  cardPlayNeedsConsume,
  cardPlayNeedsTarget,
  isTransformableHandCard,
  transformableHandCards,
} from './table-helpers';

describe('table-helpers · Card Transformer consume gate', () => {
  it('cardPlayNeedsConsume is true only for card-transformer', () => {
    expect(cardPlayNeedsConsume('card-transformer')).toBe(true);
    expect(cardPlayNeedsConsume('card-absorber')).toBe(false);
    expect(cardPlayNeedsConsume('tax')).toBe(false);
    expect(cardPlayNeedsConsume('basic-attack')).toBe(false);
  });

  it('transform eligibility matches SHARED_CARD_IDS (not specials / MEGA)', () => {
    expect(isTransformableHandCard('tax')).toBe(true);
    expect(isTransformableHandCard('basic-attack')).toBe(true);
    expect(isTransformableHandCard('shield')).toBe(true);
    expect(isTransformableHandCard('mega-attack')).toBe(false);
    expect(isTransformableHandCard('card-transformer')).toBe(false);
    expect(isTransformableHandCard('spy')).toBe(true);
  });

  it('transformableHandCards keeps only eligible hand copies', () => {
    const hand = [
      { instanceId: 'a', cardId: 'tax' as const, isUpgraded: false },
      { instanceId: 'b', cardId: 'mega-attack' as const, isUpgraded: false },
      { instanceId: 'c', cardId: 'strong-attack' as const, isUpgraded: true },
    ];
    // mega-attack is special-typed but could only appear in specials; still filtered if present
    expect(transformableHandCards(hand).map((card) => card.instanceId)).toEqual([
      'a',
      'c',
    ]);
  });

  it('cardIsSelfOnlyPlay excludes transformer (needs consume) and targeted cards', () => {
    expect(cardIsSelfOnlyPlay('tax')).toBe(true);
    expect(cardIsSelfOnlyPlay('card-transformer')).toBe(false);
    expect(cardIsSelfOnlyPlay('basic-attack')).toBe(false);
    expect(cardPlayNeedsTarget('basic-attack')).toBe(true);
  });
});
