/**
 * downgradeAllCards — technical spec v4 §4.2, L20-11, L21-02 / #V4-17.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect, makePlayer } from '../../testing/factories';
import { downgradeAllCards } from './downgrade-cards';

describe('downgradeAllCards (technical spec v4 §4.2, L20-11 / L21-02)', () => {
  it('downgrades every upgraded hand and special card and returns the count', () => {
    const victim = makePlayer({
      hand: [
        { instanceId: 'h1', cardId: 'basic-attack', isUpgraded: true },
        { instanceId: 'h2', cardId: 'tax', isUpgraded: false },
        { instanceId: 'h3', cardId: 'strong-attack', isUpgraded: true },
      ],
      specialCards: [
        { instanceId: 's1', cardId: 'cloning', isUpgraded: true },
        { instanceId: 's2', cardId: 'block', isUpgraded: false },
      ],
    });

    const removed = downgradeAllCards(victim);

    expect(removed).toBe(3);
    expect(victim.hand.map((card) => card.isUpgraded)).toEqual([false, false, false]);
    expect(victim.specialCards.map((card) => card.isUpgraded)).toEqual([false, false]);
  });

  it('also strips shieldIsUpgraded and active-persistent isUpgraded (#V4-17)', () => {
    const victim = makePlayer({
      hand: [{ instanceId: 'h1', cardId: 'basic-attack', isUpgraded: false }],
      shieldIsUpgraded: true,
      activePersistentEffects: [
        makeCounterEffect({ id: 'p1', cardId: 'imposition', isUpgraded: true, counter: 2 }),
        makeCounterEffect({ id: 'p2', cardId: 'points-generator', isUpgraded: false, counter: 3 }),
      ],
    });

    expect(downgradeAllCards(victim)).toBe(2);
    expect(victim.shieldIsUpgraded).toBe(false);
    expect(victim.activePersistentEffects.map((effect) => effect.isUpgraded)).toEqual([
      false,
      false,
    ]);
  });

  it('returns 0 when no cards are upgraded', () => {
    const victim = makePlayer({
      hand: [{ instanceId: 'h1', cardId: 'basic-attack', isUpgraded: false }],
      specialCards: [{ instanceId: 's1', cardId: 'cloning', isUpgraded: false }],
    });

    expect(downgradeAllCards(victim)).toBe(0);
  });
});
