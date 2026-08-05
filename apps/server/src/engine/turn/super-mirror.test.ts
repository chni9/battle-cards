/**
 * Super Mirror — rules spec §5, backlog L23-02.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import {
  listEligibleMirrorTargets,
  listEligibleSuperMirrorTargets,
} from './mirror-choice';
import { performTurnAction } from './perform-action';
import { queueEffect } from './queue-effect';

describe('Super Mirror (L23-02)', () => {
  it('2 pending × 3 opponents → 6 distinct copies; originals leave the user', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
        { id: 'd', nickname: 'Dan' },
      ],
      seed: 'l23-02-fanout',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');
    const dan = state.players.find((player) => player.id === 'd');

    if (
      alice === undefined ||
      bob === undefined ||
      carol === undefined ||
      dan === undefined
    ) {
      throw new Error('missing players');
    }

    for (const player of state.players) {
      player.pendingEffects = [];
    }

    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    queueEffect({
      state,
      sourcePlayerId: carol.id,
      targetPlayerId: alice.id,
      cardId: 'strong-attack',
      isUpgraded: false,
    });
    expect(alice.pendingEffects).toHaveLength(2);

    alice.points = 7;
    alice.specialCards = [
      { instanceId: 'sm-1', cardId: 'super-mirror', isUpgraded: false },
    ];
    state.currentTurnPlayerId = alice.id;

    expect(
      performTurnAction(state, alice.id, { type: 'playCard', instanceId: 'sm-1' }).ok,
    ).toBe(true);

    expect(alice.pendingEffects).toHaveLength(0);

    const copies = [...bob.pendingEffects, ...carol.pendingEffects, ...dan.pendingEffects];
    expect(copies).toHaveLength(6);
    expect(new Set(copies.map((effect) => effect.id)).size).toBe(6);
    expect(copies.every((effect) => effect.redirectedBy === 'super-mirror')).toBe(true);
    // Redirected copies are attributed to the Super Mirror user (Alice), not the originals.
    expect(copies.every((effect) => effect.sourcePlayerId === alice.id)).toBe(true);

    // Each opponent received both originals.
    for (const opponent of [bob, carol, dan]) {
      expect(opponent.pendingEffects).toHaveLength(2);
      expect(opponent.pendingEffects.map((e) => e.cardId).sort()).toEqual([
        'basic-attack',
        'strong-attack',
      ]);
    }
  });

  it('regular Mirror cannot pick Super Mirror copies; another Super Mirror can', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'l23-02-eligibility',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing players');
    }

    for (const player of state.players) {
      player.pendingEffects = [];
    }

    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    alice.points = 7;
    alice.specialCards = [
      { instanceId: 'sm-1', cardId: 'super-mirror', isUpgraded: false },
    ];
    state.currentTurnPlayerId = alice.id;
    expect(
      performTurnAction(state, alice.id, { type: 'playCard', instanceId: 'sm-1' }).ok,
    ).toBe(true);

    expect(listEligibleMirrorTargets(bob, false)).toHaveLength(0);
    expect(listEligibleMirrorTargets(bob, true)).toHaveLength(0);
    expect(listEligibleSuperMirrorTargets(bob).length).toBeGreaterThan(0);
  });

  it('upgraded doubles damageMultiplier on copies only', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l23-02-upgraded',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing players');
    }

    for (const player of state.players) {
      player.pendingEffects = [];
    }

    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    const original = alice.pendingEffects[0];
    if (original === undefined) {
      throw new Error('missing pending');
    }
    original.damageMultiplier = 1;

    alice.points = 7;
    alice.specialCards = [
      { instanceId: 'sm-1', cardId: 'super-mirror', isUpgraded: true },
    ];
    state.currentTurnPlayerId = alice.id;
    expect(
      performTurnAction(state, alice.id, { type: 'playCard', instanceId: 'sm-1' }).ok,
    ).toBe(true);

    expect(alice.pendingEffects).toHaveLength(0);
    expect(bob.pendingEffects).toHaveLength(1);
    expect(bob.pendingEffects[0]?.damageMultiplier).toBe(2);
    expect(bob.pendingEffects[0]?.redirectedBy).toBe('super-mirror');
  });

  it('fan-out back to the attacker deals damage on their turn', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l23-02-self-hit',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing players');
    }

    alice.lives = 10;
    bob.lives = 10;
    for (const player of state.players) {
      player.pendingEffects = [];
    }

    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'strong-attack',
      isUpgraded: false,
    });

    alice.points = 7;
    alice.specialCards = [
      { instanceId: 'sm-1', cardId: 'super-mirror', isUpgraded: false },
    ];
    state.currentTurnPlayerId = alice.id;
    expect(
      performTurnAction(state, alice.id, { type: 'playCard', instanceId: 'sm-1' }).ok,
    ).toBe(true);

    expect(bob.pendingEffects).toHaveLength(1);
    expect(bob.pendingEffects[0]?.sourcePlayerId).toBe(alice.id);
    expect(bob.pendingEffects[0]?.targetPlayerId).toBe(bob.id);

    state.currentTurnPlayerId = bob.id;
    expect(performTurnAction(state, bob.id, { type: 'draw' }).ok).toBe(true);
    expect(bob.lives).toBe(8);
    expect(alice.lives).toBe(10);
  });

  it('canPlay is false with no pending attacks', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l23-02-empty',
    });
    const alice = state.players.find((player) => player.id === 'a');

    if (alice === undefined) {
      throw new Error('missing actor');
    }

    alice.points = 7;
    alice.specialCards = [
      { instanceId: 'sm-1', cardId: 'super-mirror', isUpgraded: false },
    ];
    alice.pendingEffects = [];
    state.currentTurnPlayerId = alice.id;

    expect(
      performTurnAction(state, alice.id, { type: 'playCard', instanceId: 'sm-1' }).ok,
    ).toBe(false);
    expect(alice.specialCards).toHaveLength(1);
  });

  it('returns mirrorRedirects for each Super Mirror duplicate (L30-06)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
        { id: 'd', nickname: 'Dan' },
      ],
      seed: 'l30-06-super-mirror-log',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');
    const dan = state.players.find((player) => player.id === 'd');

    if (
      alice === undefined ||
      bob === undefined ||
      carol === undefined ||
      dan === undefined
    ) {
      throw new Error('missing players');
    }

    for (const player of state.players) {
      player.pendingEffects = [];
    }

    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    queueEffect({
      state,
      sourcePlayerId: carol.id,
      targetPlayerId: alice.id,
      cardId: 'strong-attack',
      isUpgraded: false,
    });

    alice.points = 7;
    alice.specialCards = [
      { instanceId: 'sm-1', cardId: 'super-mirror', isUpgraded: false },
    ];
    state.currentTurnPlayerId = alice.id;

    const result = performTurnAction(state, alice.id, {
      type: 'playCard',
      instanceId: 'sm-1',
    });
    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.mirrorRedirects).toHaveLength(6);
    expect(result.mirrorRedirects?.every((redirect) => redirect.cardId === 'super-mirror')).toBe(
      true,
    );
    expect(result.mirrorRedirects?.every((redirect) => redirect.actorPlayerId === alice.id)).toBe(
      true,
    );
    expect(
      result.mirrorRedirects?.every(
        (redirect) => redirect.previousTargetPlayerId === alice.id,
      ),
    ).toBe(true);
    expect(
      new Set(result.mirrorRedirects?.map((redirect) => redirect.newTargetPlayerId)).size,
    ).toBe(3);
    void bob;
    void carol;
    void dan;
  });
});
