import type { AttackCardId } from '@card-battle/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { makeCounterEffect, makePlayer } from '../../testing/factories';
import { applyDamage } from './apply-damage';

describe('applyDamage — shield (rules spec §1, technical spec §4.2)', () => {
  it('absorbs damage with the shield before lives', () => {
    const target = makePlayer({ lives: 10, shield: 4 });

    const outcome = applyDamage(target, 3, 'strong-attack');

    expect(target.shield).toBe(1);
    expect(target.lives).toBe(10);
    expect(outcome.shieldAbsorbed).toBe(3);
    expect(outcome.livesLost).toBe(0);
  });

  it('carries the excess over to lives once the shield is exhausted', () => {
    const target = makePlayer({ lives: 10, shield: 4 });

    const outcome = applyDamage(target, 7, 'super-attack');

    expect(target.shield).toBe(0);
    expect(target.lives).toBe(7);
    expect(outcome.shieldAbsorbed).toBe(4);
    expect(outcome.livesLost).toBe(3);
  });

  it('takes lives directly when no shield is active', () => {
    const target = makePlayer({ lives: 10, shield: 0 });

    applyDamage(target, 1, 'basic-attack');

    expect(target.lives).toBe(9);
  });
});

describe('applyDamage — internal counters (rules spec §5)', () => {
  it('removes one counter point per life lost', () => {
    const effect = makeCounterEffect({ counter: 3 });
    const target = makePlayer({ lives: 10, activePersistentEffects: [effect] });

    const outcome = applyDamage(target, 2, 'strong-attack');

    expect(effect.counter).toBe(1);
    expect(outcome.countersDecremented).toEqual([
      { effectId: effect.id, cardId: effect.cardId, amount: 2 },
    ]);
  });

  it('leaves counters untouched when the shield absorbs the whole hit', () => {
    const effect = makeCounterEffect({ counter: 3 });
    const target = makePlayer({ lives: 10, shield: 4, activePersistentEffects: [effect] });

    const outcome = applyDamage(target, 3, 'strong-attack');

    expect(effect.counter).toBe(3);
    expect(outcome.countersDecremented).toEqual([]);
  });

  it('deactivates and permanently loses a card whose counter reaches 0', () => {
    const effect = makeCounterEffect({ id: 'imposition-1', cardId: 'imposition', counter: 2 });
    const target = makePlayer({ lives: 10, activePersistentEffects: [effect] });

    const outcome = applyDamage(target, 2, 'strong-attack');

    expect(target.activePersistentEffects).toEqual([]);
    expect(outcome.deactivatedEffectIds).toEqual(['imposition-1']);
  });

  it('does not let the counter protect its user from the damage', () => {
    const target = makePlayer({ lives: 10, activePersistentEffects: [makeCounterEffect()] });

    applyDamage(target, 2, 'strong-attack');

    expect(target.lives).toBe(8);
  });

  it('decrements again on a second attack in the same turn', () => {
    const effect = makeCounterEffect({ counter: 3 });
    const target = makePlayer({ lives: 10, activePersistentEffects: [effect] });

    applyDamage(target, 1, 'basic-attack');
    applyDamage(target, 1, 'basic-attack');

    expect(effect.counter).toBe(1);
    expect(target.lives).toBe(8);
  });

  it('never takes a counter below 0, and reports only what it lost', () => {
    const effect = makeCounterEffect({ counter: 2 });
    const target = makePlayer({ lives: 10, activePersistentEffects: [effect] });

    const outcome = applyDamage(target, 7, 'super-attack');

    expect(effect.counter).toBe(0);
    expect(outcome.countersDecremented[0]?.amount).toBe(2);
  });

  it('ignores a persistent effect that has no counter', () => {
    const effect = makeCounterEffect({ cardId: 'cloning', counter: null });
    const target = makePlayer({ lives: 10, activePersistentEffects: [effect] });

    const outcome = applyDamage(target, 2, 'strong-attack');

    expect(target.activePersistentEffects).toEqual([effect]);
    expect(outcome.countersDecremented).toEqual([]);
  });
});

describe('applyDamage — boundaries', () => {
  it('floors lives at 0 and reports only the lives actually lost', () => {
    const target = makePlayer({ lives: 2 });

    const outcome = applyDamage(target, 7, 'super-attack');

    expect(target.lives).toBe(0);
    expect(outcome.livesLost).toBe(2);
  });

  it('does not eliminate the player itself — the turn loop does (technical spec §4.3)', () => {
    const target = makePlayer({ lives: 1 });

    applyDamage(target, 1, 'basic-attack');

    expect(target.isEliminated).toBe(false);
  });

  it('rejects a negative amount instead of healing through an attack', () => {
    const target = makePlayer({ lives: 10 });

    expect(() => applyDamage(target, -3, 'basic-attack')).toThrow(RangeError);
    expect(target.lives).toBe(10);
  });

  it('accepts only an attack card as its source (technical spec §4.2)', () => {
    // The reason Tax cannot call this function is the type, not a convention: widen the
    // parameter to CardId and this assertion fails.
    expectTypeOf(applyDamage).parameter(2).toEqualTypeOf<AttackCardId>();
  });
});
