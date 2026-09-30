/**
 * Answer a pending attack from an eliminated player (Lot 68).
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { listLegalPlayCardActions } from './list-legal-play-card';
import { performTurnAction } from './perform-action';
import { queueEffect } from './queue-effect';

describe('dead riposte (L68-07)', () => {
  it('lets a basic cancel the corpse attack and does not keep the answer', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l68-07-riposte',
      kitAssignment: ['kamikaze', 'kamikaze'],
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    if (alice === undefined || bob === undefined) {
      throw new Error('missing seats');
    }

    alice.isEliminated = true;
    alice.lives = 0;
    bob.lives = 20;
    bob.points = 5;
    bob.hand = [{ instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false }];
    bob.pendingEffects = [];
    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    state.currentTurnPlayerId = bob.id;
    const legal = listLegalPlayCardActions(state, bob);
    expect(
      legal.some(
        (action) =>
          action.type === 'playCard' &&
          action.instanceId === 'basic-1' &&
          action.targetPlayerId === alice.id,
      ),
    ).toBe(true);

    const played = performTurnAction(state, bob.id, {
      type: 'playCard',
      instanceId: 'basic-1',
      targetPlayerId: alice.id,
    });
    expect(played.ok).toBe(true);
    expect(bob.lives).toBe(20);
    expect(alice.pendingEffects.some((effect) => effect.sourcePlayerId === bob.id)).toBe(false);
  });

  it('rejects an attack on a corpse with nothing pending', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l68-07-no-pending',
      kitAssignment: ['kamikaze', 'kamikaze'],
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    if (alice === undefined || bob === undefined) {
      throw new Error('missing seats');
    }

    alice.isEliminated = true;
    bob.points = 5;
    bob.hand = [{ instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false }];
    bob.pendingEffects = [];
    state.currentTurnPlayerId = bob.id;

    const played = performTurnAction(state, bob.id, {
      type: 'playCard',
      instanceId: 'basic-1',
      targetPlayerId: alice.id,
    });
    expect(played.ok).toBe(false);
  });

  it('lets a Thief cancel the corpse Thief and does not keep the answer', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l68-thief-riposte',
      kitAssignment: ['kamikaze', 'kamikaze'],
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    if (alice === undefined || bob === undefined) {
      throw new Error('missing seats');
    }

    alice.isEliminated = true;
    alice.lives = 0;
    alice.points = 3;
    bob.lives = 20;
    bob.points = 20;
    bob.hand = [{ instanceId: 'thief-1', cardId: 'thief', isUpgraded: false }];
    bob.pendingEffects = [];
    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'thief',
      isUpgraded: false,
    });

    state.currentTurnPlayerId = bob.id;
    const legal = listLegalPlayCardActions(state, bob);
    expect(
      legal.some(
        (action) =>
          action.type === 'playCard' &&
          action.instanceId === 'thief-1' &&
          action.targetPlayerId === alice.id,
      ),
    ).toBe(true);

    const played = performTurnAction(state, bob.id, {
      type: 'playCard',
      instanceId: 'thief-1',
      targetPlayerId: alice.id,
    });
    expect(played.ok).toBe(true);
    expect(bob.points).toBe(15);
    expect(alice.points).toBe(3);
    expect(bob.pendingEffects).toHaveLength(0);
    expect(alice.pendingEffects.some((effect) => effect.sourcePlayerId === bob.id)).toBe(false);
  });

  it('rejects a Thief on a corpse who has no Thief pending', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l68-thief-no-pending',
      kitAssignment: ['kamikaze', 'kamikaze'],
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    if (alice === undefined || bob === undefined) {
      throw new Error('missing seats');
    }

    alice.isEliminated = true;
    bob.points = 20;
    bob.hand = [{ instanceId: 'thief-1', cardId: 'thief', isUpgraded: false }];
    bob.pendingEffects = [];
    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    state.currentTurnPlayerId = bob.id;

    const played = performTurnAction(state, bob.id, {
      type: 'playCard',
      instanceId: 'thief-1',
      targetPlayerId: alice.id,
    });
    expect(played.ok).toBe(false);
    expect(bob.points).toBe(20);
  });

  it('discards an upgraded Thief answer after it cancels the corpse Thief', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l68-thief-upgraded-answer',
      kitAssignment: ['kamikaze', 'kamikaze'],
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    if (alice === undefined || bob === undefined) {
      throw new Error('missing seats');
    }

    alice.isEliminated = true;
    alice.points = 0;
    bob.points = 20;
    bob.hand = [{ instanceId: 'thief-plus', cardId: 'thief', isUpgraded: true }];
    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'thief',
      isUpgraded: false,
    });
    state.currentTurnPlayerId = bob.id;

    const played = performTurnAction(state, bob.id, {
      type: 'playCard',
      instanceId: 'thief-plus',
      targetPlayerId: alice.id,
    });
    expect(played.ok).toBe(true);
    expect(bob.points).toBe(15);
    expect(alice.points).toBe(0);
    expect(alice.pendingEffects).toHaveLength(0);
    expect(bob.pendingEffects).toHaveLength(0);
  });
});
