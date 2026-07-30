/**
 * Spy/Thief counter rule — rules spec §1, tech §4.7, backlog L3-06.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';
import { resolvePendingEffects } from './resolve-pending';

describe('Spy/Thief counter (L3-06)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
    { id: 'c', nickname: 'Carol' },
  ] as const;

  it('reciprocal Spy cancels both; copies stay in hand; no visibility granted', () => {
    const state = createInitialState({ seats, seed: 'counter-spy' });
    state.currentTurnPlayerId = 'a';
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();

    if (alice === undefined || bob === undefined) {
      return;
    }

    alice.points = 4;
    alice.hand = [{ instanceId: 'spy-a', cardId: 'spy', isUpgraded: false }];
    bob.points = 4;
    bob.hand = [{ instanceId: 'spy-b', cardId: 'spy', isUpgraded: false }];

    performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'spy-a',
      targetPlayerId: 'b',
    });

    expect(bob.pendingEffects).toHaveLength(1);

    state.currentTurnPlayerId = 'b';
    performTurnAction(state, 'b', {
      type: 'playCard',
      instanceId: 'spy-b',
      targetPlayerId: 'a',
    });

    expect(state.visibility).toHaveLength(0);
    expect(alice.pendingEffects).toHaveLength(0);
    expect(alice.hand.some((card) => card.instanceId === 'spy-a')).toBe(true);
    expect(bob.hand.some((card) => card.instanceId === 'spy-b')).toBe(true);
  });

  it('same card on a third party does not cancel', () => {
    const state = createInitialState({ seats, seed: 'counter-third' });
    state.currentTurnPlayerId = 'a';
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    expect(carol).toBeDefined();

    if (alice === undefined || bob === undefined || carol === undefined) {
      return;
    }

    alice.points = 4;
    alice.hand = [{ instanceId: 'spy-a', cardId: 'spy', isUpgraded: false }];
    bob.points = 4;
    bob.hand = [{ instanceId: 'spy-b', cardId: 'spy', isUpgraded: false }];

    performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'spy-a',
      targetPlayerId: 'b',
    });

    state.currentTurnPlayerId = 'b';
    performTurnAction(state, 'b', {
      type: 'playCard',
      instanceId: 'spy-b',
      targetPlayerId: 'c',
    });

    expect(state.visibility.some((r) => r.viewerId === 'a' && r.subjectId === 'b')).toBe(true);
    expect(carol.pendingEffects.some((e) => e.cardId === 'spy')).toBe(true);
  });

  it('if only the counter is absent, the original Spy still applies', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'counter-orphan',
    });
    const bob = state.players.find((player) => player.id === 'b');

    expect(bob).toBeDefined();

    if (bob === undefined) {
      return;
    }

    state.visibility = [];
    bob.pendingEffects = [
      {
        id: 'orig',
        sourcePlayerId: 'a',
        targetPlayerId: 'b',
        cardId: 'spy',
        isUpgraded: false,
        queuedAt: 1,
      },
    ];

    resolvePendingEffects(state, 'b');

    expect(state.visibility.some((r) => r.viewerId === 'a' && r.subjectId === 'b')).toBe(true);
  });
});
