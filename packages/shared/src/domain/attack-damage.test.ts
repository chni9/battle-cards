import { describe, expect, it } from 'vitest';

import { ATTACK_DAMAGE, attackDamageFor } from './attack-damage';
import { ATTACK_CARD_IDS } from './card';

describe('ATTACK_DAMAGE (rules spec §2, L2-04)', () => {
  it('matches the six base/upgraded values from the rules table', () => {
    expect(ATTACK_DAMAGE['basic-attack']).toEqual({ base: 1, upgraded: 3 });
    expect(ATTACK_DAMAGE['strong-attack']).toEqual({ base: 2, upgraded: 4 });
    expect(ATTACK_DAMAGE['super-attack']).toEqual({ base: 7, upgraded: 10 });
  });

  it('covers every attack card id', () => {
    expect(Object.keys(ATTACK_DAMAGE).sort()).toEqual([...ATTACK_CARD_IDS].sort());
  });

  it('returns base or upgraded damage', () => {
    expect(attackDamageFor('super-attack', false)).toBe(7);
    expect(attackDamageFor('super-attack', true)).toBe(10);
  });
});
