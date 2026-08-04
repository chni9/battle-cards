/**
 * Attack-ness decoupling — technical spec v4 §4.1 / L20-05.
 */

import {
  ATTACK_CARD_IDS,
  ATTACK_DAMAGE,
  SPECIAL_ATTACK_CARD_IDS,
  attackDamageFor,
  isAttackCardId,
  isSharedAttackCardId,
} from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { makePlayer } from '../testing/factories';
import { applyDamage } from './life/apply-damage';

describe('attack-ness decoupling (L20-05)', () => {
  it('keeps the shop/deal list at three entries', () => {
    expect(ATTACK_CARD_IDS).toHaveLength(3);
    expect(SPECIAL_ATTACK_CARD_IDS).toEqual(['mega-attack']);
  });

  it('treats mega-attack as an AttackCardId for damage, not as a shared shop attack', () => {
    expect(isAttackCardId('mega-attack')).toBe(true);
    expect(isSharedAttackCardId('mega-attack')).toBe(false);
    expect(ATTACK_DAMAGE['mega-attack']).toEqual({ base: 20, upgraded: 20 });
    expect(attackDamageFor('mega-attack', false)).toBe(20);
    expect(attackDamageFor('mega-attack', true)).toBe(20);
  });

  it('lets applyDamage accept mega-attack including full shield absorb', () => {
    const target = makePlayer({ lives: 10, shield: 25 });
    const outcome = applyDamage(target, 20, 'mega-attack');
    expect(outcome.shieldAbsorbed).toBe(20);
    expect(outcome.livesLost).toBe(0);
    expect(target.lives).toBe(10);
    expect(target.shield).toBe(5);
  });
});
