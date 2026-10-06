/**
 * Forced slot-drop — Lot 69.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { applyDefaultSlotDrop, beginSlotDrop } from './slot-drop';

describe('forced slot-drop', () => {
  it('default expiry skips Curse and drops oldest other slot', () => {
    const state = createInitialState({
      seats: [{ id: 'a', nickname: 'A' }, { id: 'b', nickname: 'B' }],
      seed: 'slot-drop-default',
    });
    const a = state.players.find((player) => player.id === 'a');
    if (a === undefined) {
      throw new Error('missing a');
    }

    a.shield = 4;
    a.shieldSlotQueuedAt = 1;
    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-on-me',
        cardId: 'curse',
        counter: null,
        slotQueuedAt: 2,
      }),
      makeCounterEffect({ id: 'p1', cardId: 'poison', counter: 3, slotQueuedAt: 3 }),
    ];

    beginSlotDrop(state, {
      chooserPlayerId: a.id,
      slotOwnerId: a.id,
      pending: { kind: 'persistent', ownerPlayerId: a.id, cardId: 'roulette', isUpgraded: false, counter: 2 },
      nowMs: 0,
    });

    expect(applyDefaultSlotDrop(state, a.id).ok).toBe(true);
    expect(a.shield).toBe(0);
    expect(a.activePersistentEffects.some((effect) => effect.cardId === 'curse')).toBe(true);
    expect(a.activePersistentEffects.some((effect) => effect.cardId === 'poison')).toBe(true);
    expect(a.activePersistentEffects.some((effect) => effect.cardId === 'roulette')).toBe(true);
  });
});
