/**
 * Content-scope assertions — technical spec v4 §10.5 / L20-06 + L28-03.
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
import { KIT_CATALOG } from './kit-catalog';

const ALL_CARD_IDS: readonly CardId[] = [
  ...ATTACK_CARD_IDS,
  ...ACTION_CARD_IDS,
  ...SPECIAL_CARD_IDS,
];

const DECLARED_CARD_IDS = new Set<string>(ALL_CARD_IDS);

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
});

describe('content scope — kits (technical spec v4 §10.5 / L28-03)', () => {
  it('keeps KIT_IDS and KIT_CATALOG exhaustive over each other', () => {
    expect(Object.keys(KIT_CATALOG).sort()).toEqual([...KIT_IDS].sort());
    expect(new Set(KIT_IDS).size).toBe(KIT_IDS.length);
  });

  it('uses kebab-case kit ids', () => {
    expect(KIT_IDS.filter((id) => !/^[a-z]+(?:-[a-z]+)*$/.test(id))).toEqual([]);
  });

  it('references only declared card ids in every kit specialCards list', () => {
    const bad: string[] = [];

    for (const kitId of KIT_IDS) {
      for (const cardId of KIT_CATALOG[kitId].specialCards) {
        if (!DECLARED_CARD_IDS.has(cardId)) {
          bad.push(`${kitId}:${cardId}`);
        }
      }
    }

    expect(bad).toEqual([]);
  });

  /**
   * V4 closed kit count is 15 (Lots 27–28). Exhaustive over KIT_IDS / KIT_CATALOG;
   * client KIT_FILES is asserted in asset-lookup.test.ts (Lot 30 art gate).
   */
  it('ships exactly 15 kits including Ghost and Duplicator', () => {
    expect(KIT_IDS).toContain('ghost');
    expect(KIT_IDS).toContain('duplicator');
    expect(KIT_IDS).toContain('upgrader');
    expect(KIT_IDS).toContain('tactician');
    expect(KIT_IDS).toContain('prophet');
    expect(KIT_IDS).toContain('warrior');
    expect(KIT_IDS).toHaveLength(15);
    expect(Object.keys(KIT_CATALOG)).toHaveLength(15);
  });
});
