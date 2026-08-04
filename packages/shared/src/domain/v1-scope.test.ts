import { describe, expect, it } from 'vitest';

import {
  ACTION_CARD_IDS,
  ATTACK_CARD_IDS,
  SPECIAL_CARD_IDS,
  type CardId,
} from './card';
import { KIT_IDS } from './kit';

const ALL_CARD_IDS: readonly CardId[] = [
  ...ATTACK_CARD_IDS,
  ...ACTION_CARD_IDS,
  ...SPECIAL_CARD_IDS,
];

describe('V1 content scope (technical spec §2)', () => {
  it('holds all 3 attack cards', () => {
    expect(ATTACK_CARD_IDS).toHaveLength(3);
  });

  it('holds all 7 action cards', () => {
    expect(ACTION_CARD_IDS).toHaveLength(7);
  });

  it('holds the 20 special cards of rules spec §5 (L20-04)', () => {
    expect(SPECIAL_CARD_IDS).toHaveLength(20);
  });

  it('totals 30 cards', () => {
    expect(ALL_CARD_IDS).toHaveLength(30);
  });

  it('holds the 4 kits of the V1 lot, not the 15 of rules spec §4', () => {
    expect(KIT_IDS).toHaveLength(4);
  });
});

describe('card identity', () => {
  it('never repeats an id', () => {
    expect(new Set(ALL_CARD_IDS).size).toBe(ALL_CARD_IDS.length);
  });

  it('keeps damage-dealing ids disjoint from action and special ids', () => {
    // Guards the boundary `applyDamage` relies on: only an AttackCardId may reach it,
    // so an id must never belong to both sets (technical spec §4.2).
    const nonAttack = new Set<string>([...ACTION_CARD_IDS, ...SPECIAL_CARD_IDS]);
    expect(ATTACK_CARD_IDS.filter((id) => nonAttack.has(id))).toEqual([]);
  });

  it('uses kebab-case ids so they are stable across the wire and the log', () => {
    expect(ALL_CARD_IDS.filter((id) => !/^[a-z]+(?:-[a-z]+)*$/.test(id))).toEqual([]);
  });
});
