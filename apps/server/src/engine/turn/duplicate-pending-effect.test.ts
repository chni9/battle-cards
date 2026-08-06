/**
 * duplicatePendingEffect — technical spec v4 §4.2, backlog L20-15.
 */

import { describe, expect, it } from 'vitest';

import type { PendingEffect } from '@card-battle/shared';

import { createInitialState } from '../create-initial-state';
import { duplicatePendingEffect } from './duplicate-pending-effect';

describe('duplicatePendingEffect (technical spec v4 §4.2, L20-15)', () => {
  it('mints distinct ids while preserving damageMultiplier and queuedAt', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'l20-15-dup',
    });

    const source: PendingEffect = {
      id: 'orig-1',
      sourcePlayerId: 'a',
      targetPlayerId: 'b',
      cardId: 'basic-attack',
      isUpgraded: false,
      queuedAt: 7,
      damageMultiplier: 4,
      redirectedBy: null,
      chosenInstanceId: null,
    };

    const dupB = duplicatePendingEffect(state, source, 'b', 'super-mirror');
    const dupC = duplicatePendingEffect(state, source, 'c', 'super-mirror');

    expect(dupB.id).not.toBe(source.id);
    expect(dupC.id).not.toBe(source.id);
    expect(dupB.id).not.toBe(dupC.id);

    expect(dupB.queuedAt).toBe(7);
    expect(dupC.queuedAt).toBe(7);
    expect(dupB.damageMultiplier).toBe(4);
    expect(dupC.damageMultiplier).toBe(4);

    expect(dupB.redirectedBy).toBe('super-mirror');
    expect(dupC.redirectedBy).toBe('super-mirror');
    expect(dupB.sourcePlayerId).toBe('a');
    expect(dupC.sourcePlayerId).toBe('a');

    const overridden = duplicatePendingEffect(
      state,
      source,
      'b',
      'super-mirror',
      'c',
    );
    expect(overridden.sourcePlayerId).toBe('c');

    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');

    expect(bob?.pendingEffects).toContainEqual(dupB);
    expect(carol?.pendingEffects).toContainEqual(dupC);
  });
});
