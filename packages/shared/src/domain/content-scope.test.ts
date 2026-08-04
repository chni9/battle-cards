/**
 * Content-scope card assertions — technical spec v4 §10.5 / L20-06.
 * Kit-side assertions wait for L28-03.
 */

import { describe, expect, it } from 'vitest';

import { ATTACK_DAMAGE } from './attack-damage';
import {
  ACTION_CARD_IDS,
  ATTACK_CARD_IDS,
  SPECIAL_ATTACK_CARD_IDS,
  SPECIAL_CARD_IDS,
  isAttackCardId,
  type CardId,
} from './card';
import { KIT_IDS } from './kit';

const ALL_CARD_IDS: readonly CardId[] = [
  ...ATTACK_CARD_IDS,
  ...ACTION_CARD_IDS,
  ...SPECIAL_CARD_IDS,
];

describe('content scope — cards (technical spec v4 §8 / §10.5)', () => {
  it('holds 3 shop attack + 7 action + 20 special ids', () => {
    expect(ATTACK_CARD_IDS).toHaveLength(3);
    expect(ACTION_CARD_IDS).toHaveLength(7);
    expect(SPECIAL_CARD_IDS).toHaveLength(20);
    expect(ALL_CARD_IDS).toHaveLength(30);
  });

  it('never repeats a card id', () => {
    expect(new Set(ALL_CARD_IDS).size).toBe(ALL_CARD_IDS.length);
  });

  it('keeps the two attack arrays disjoint and exhaustive for isAttackCardId', () => {
    const shop = new Set<string>(ATTACK_CARD_IDS);
    const specialAttacks = new Set<string>(SPECIAL_ATTACK_CARD_IDS);
    expect([...shop].filter((id) => specialAttacks.has(id))).toEqual([]);

    const attackUnion = [...ATTACK_CARD_IDS, ...SPECIAL_ATTACK_CARD_IDS];
    expect(attackUnion.every((id) => isAttackCardId(id))).toBe(true);
    expect(ALL_CARD_IDS.filter((id) => isAttackCardId(id)).sort()).toEqual(
      [...attackUnion].sort(),
    );
  });

  it('covers ATTACK_DAMAGE over the attack-id union', () => {
    expect(Object.keys(ATTACK_DAMAGE).sort()).toEqual(
      [...ATTACK_CARD_IDS, ...SPECIAL_ATTACK_CARD_IDS].sort(),
    );
  });

  it('uses kebab-case ids so they are stable across the wire and the log', () => {
    expect(ALL_CARD_IDS.filter((id) => !/^[a-z]+(?:-[a-z]+)*$/.test(id))).toEqual([]);
  });

  it('still holds the 4 kits until Lot 28 closes the kit scope', () => {
    expect(KIT_IDS).toHaveLength(4);
  });
});
