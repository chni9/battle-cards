/**
 * Content-scope assertions — technical spec v4 §10.5 / L20-06 + L28-03.
 */

import { describe, expect, it } from 'vitest';

import { ATTACK_DAMAGE } from './attack-damage';
import {
  ACTION_CARD_IDS,
  ATTACK_CARD_IDS,
  CARD_LIVES_SPECIAL_IDS,
  CIRCULATING_SPECIAL_CARD_IDS,
  PURCHASABLE_SPECIAL_CARD_IDS,
  SPECIAL_ATTACK_CARD_IDS,
  SPECIAL_CARD_IDS,
  TEMPORARILY_UNAVAILABLE_SPECIAL_CARD_IDS,
  TRANSFORM_RESULT_SPECIAL_IDS,
  cardActsOnOpponents,
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
  it('holds 3 shop attack + 7 action + 21 special ids', () => {
    expect(ATTACK_CARD_IDS).toHaveLength(3);
    expect(ACTION_CARD_IDS).toHaveLength(7);
    expect(SPECIAL_CARD_IDS).toHaveLength(21);
    expect(ALL_CARD_IDS).toHaveLength(31);
  });

  it('keeps Card Transformer out of its own result pool (L50-08)', () => {
    expect(TRANSFORM_RESULT_SPECIAL_IDS).not.toContain('card-transformer');
    expect([...TRANSFORM_RESULT_SPECIAL_IDS].sort()).toEqual(
      [...CIRCULATING_SPECIAL_CARD_IDS].filter((id) => id !== 'card-transformer').sort(),
    );
  });

  it('keeps Invisibility in circulating pools (L58-06)', () => {
    expect(SPECIAL_CARD_IDS).toContain('invisibility');
    expect(CIRCULATING_SPECIAL_CARD_IDS).toHaveLength(21);
    expect(CIRCULATING_SPECIAL_CARD_IDS).toContain('invisibility');
    expect(PURCHASABLE_SPECIAL_CARD_IDS).toEqual(CIRCULATING_SPECIAL_CARD_IDS);
    expect(TRANSFORM_RESULT_SPECIAL_IDS).toHaveLength(20);
    expect(TRANSFORM_RESULT_SPECIAL_IDS).toContain('invisibility');
    expect(TEMPORARILY_UNAVAILABLE_SPECIAL_CARD_IDS).toEqual([]);
  });

  it('treats spec §5 counters as card lives (L58-06 / L63-01)', () => {
    expect([...CARD_LIVES_SPECIAL_IDS].sort()).toEqual(
      ['factory', 'imposition', 'points-generator', 'poison', 'super-absorber'].sort(),
    );
  });

  it('marks Mirror and attacks as acting on opponents, not Tax (L58-06)', () => {
    expect(cardActsOnOpponents('mirror')).toBe(true);
    expect(cardActsOnOpponents('super-mirror')).toBe(true);
    expect(cardActsOnOpponents('basic-attack')).toBe(true);
    expect(cardActsOnOpponents('spy')).toBe(true);
    expect(cardActsOnOpponents('tax')).toBe(false);
    expect(cardActsOnOpponents('regeneration')).toBe(false);
    expect(cardActsOnOpponents('card-transformer')).toBe(false);
    expect(cardActsOnOpponents('card-absorber')).toBe(false);
    expect(cardActsOnOpponents('invisibility')).toBe(false);
    expect(cardActsOnOpponents('attack-thief')).toBe(false);
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
  it('ships exactly 16 kits including Ghost, Duplicator and Gambler', () => {
    expect(KIT_IDS).toContain('ghost');
    expect(KIT_IDS).toContain('duplicator');
    expect(KIT_IDS).toContain('gambler');
    expect(KIT_IDS).toContain('upgrader');
    expect(KIT_IDS).toContain('tactician');
    expect(KIT_IDS).toContain('prophet');
    expect(KIT_IDS).toContain('warrior');
    expect(KIT_IDS).toHaveLength(16);
    expect(Object.keys(KIT_CATALOG)).toHaveLength(16);
  });
});
