/**
 * cancelPendingEffect — technical spec v4 §4.2, backlog L20-12.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import {
  cancelPendingEffect,
  toBlockedActionResolved,
} from './cancel-pending-effect';

describe('cancelPendingEffect (technical spec v4 §4.2, L20-12)', () => {
  it('removes a pending effect from any player by id and returns it with the reason', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l20-12',
    });
    const bob = state.players.find((player) => player.id === 'b');

    if (bob === undefined) {
      return;
    }

    bob.pendingEffects = [
      {
        id: 'pending-1',
        sourcePlayerId: 'a',
        targetPlayerId: 'b',
        cardId: 'basic-attack',
        isUpgraded: false,
        queuedAt: 1,
        damageMultiplier: 1,
        redirectedBy: null,
      chosenInstanceId: null,
      },
    ];

    const blocked = cancelPendingEffect(state, 'pending-1', 'attack-thief');

    expect(blocked).not.toBe(false);
    if (blocked === false) {
      return;
    }

    expect(blocked.reason).toBe('attack-thief');
    expect(blocked.effect.id).toBe('pending-1');
    expect(bob.pendingEffects).toHaveLength(0);
    expect(toBlockedActionResolved(blocked)).toEqual({
      effectId: 'pending-1',
      sourcePlayerId: 'a',
      targetPlayerId: 'b',
      cardId: 'basic-attack',
      isUpgraded: false,
      livesLost: 0,
      shieldAbsorbed: 0,
      outcome: 'blocked',
    });
  });

  it('returns false when the effect id is not on any queue', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l20-12-miss',
    });

    expect(cancelPendingEffect(state, 'missing', 'block')).toBe(false);
  });
});
