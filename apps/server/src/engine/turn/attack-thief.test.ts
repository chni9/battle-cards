/**
 * Attack Thief — rules spec §5, backlog L23-03.
 */

import { describe, expect, it } from 'vitest';

import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';
import { queueEffect } from './queue-effect';

describe('Attack Thief (L23-03)', () => {
  it('charge is spent before mutual cancel (#V4-5); later attack is not blocked', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l23-03-charge-before-mutual',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing players');
    }

    alice.lives = 20;
    bob.lives = 20;
    alice.attackBlockCharges = 1;
    for (const player of state.players) {
      player.pendingEffects = [];
    }

    // Equal basics: without charge, mutual would cancel both.
    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    state.currentTurnPlayerId = alice.id;
    const first = performTurnAction(state, alice.id, { type: 'draw' });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    expect(first.resolved.some((entry) => entry.outcome === 'blocked')).toBe(true);
    expect(alice.attackBlockCharges).toBe(0);
    expect(alice.lives).toBe(20);
    // Retaliation was not consumed by mutual (incoming was blocked first).
    expect(bob.pendingEffects).toHaveLength(1);

    // Second incoming attack with no charge left.
    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'strong-attack',
      isUpgraded: false,
    });
    state.currentTurnPlayerId = alice.id;
    const second = performTurnAction(state, alice.id, { type: 'draw' });
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    expect(second.resolved.some((entry) => entry.outcome === 'blocked')).toBe(false);
    expect(alice.lives).toBe(18);
  });

  it('base steals one shared attack per opponent; MEGA is never stolen (#V4-31)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'l23-03-steal-base',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');

    if (alice === undefined || bob === undefined || carol === undefined) {
      throw new Error('missing players');
    }

    alice.points = 8;
    alice.specialCards = [
      { instanceId: 'at-1', cardId: 'attack-thief', isUpgraded: false },
    ];
    alice.hand = [];
    for (const player of state.players) {
      player.pendingEffects = [];
    }

    bob.hand = [
      { instanceId: 'b-basic', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'b-mega', cardId: 'mega-attack', isUpgraded: false },
    ];
    bob.specialCards = [];
    carol.hand = [
      { instanceId: 'c-strong', cardId: 'strong-attack', isUpgraded: false },
    ];
    carol.specialCards = [
      { instanceId: 'c-mega', cardId: 'mega-attack', isUpgraded: false },
    ];

    state.currentTurnPlayerId = alice.id;
    expect(
      performTurnAction(state, alice.id, { type: 'playCard', instanceId: 'at-1' }).ok,
    ).toBe(true);
    expect(alice.attackBlockCharges).toBe(1);
    expect(bob.pendingEffects.some((e) => e.cardId === 'attack-thief')).toBe(true);
    expect(carol.pendingEffects.some((e) => e.cardId === 'attack-thief')).toBe(true);

    state.currentTurnPlayerId = bob.id;
    expect(performTurnAction(state, bob.id, { type: 'draw' }).ok).toBe(true);
    expect(bob.hand.some((c) => c.cardId === 'mega-attack')).toBe(true);
    expect(bob.hand.some((c) => c.cardId === 'basic-attack')).toBe(false);
    expect(alice.hand.some((c) => c.cardId === 'basic-attack')).toBe(true);

    state.currentTurnPlayerId = carol.id;
    expect(performTurnAction(state, carol.id, { type: 'draw' }).ok).toBe(true);
    expect(carol.specialCards.some((c) => c.cardId === 'mega-attack')).toBe(true);
    expect(carol.hand.some((c) => c.cardId === 'strong-attack')).toBe(false);
    expect(alice.hand.some((c) => c.cardId === 'strong-attack')).toBe(true);
  });

  it('upgraded steals all shared attacks from all opponents', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l23-03-steal-up',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing players');
    }

    alice.points = 8;
    alice.hand = [];
    alice.specialCards = [
      { instanceId: 'at-1', cardId: 'attack-thief', isUpgraded: true },
    ];
    for (const player of state.players) {
      player.pendingEffects = [];
    }

    bob.hand = [
      { instanceId: 'b1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'b2', cardId: 'strong-attack', isUpgraded: false },
      { instanceId: 'b-mega', cardId: 'mega-attack', isUpgraded: false },
    ];
    bob.specialCards = [];

    state.currentTurnPlayerId = alice.id;
    expect(
      performTurnAction(state, alice.id, { type: 'playCard', instanceId: 'at-1' }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = bob.id;
    expect(performTurnAction(state, bob.id, { type: 'draw' }).ok).toBe(true);

    expect(bob.hand.map((c) => c.cardId)).toEqual(['mega-attack']);
    expect(alice.hand.map((c) => c.cardId).sort()).toEqual([
      'basic-attack',
      'strong-attack',
    ]);
  });

  it('publishes presence publicly and charge count only on self', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l23-03-view',
    });
    const alice = state.players.find((player) => player.id === 'a');

    if (alice === undefined) {
      throw new Error('missing actor');
    }

    alice.attackBlockCharges = 2;

    const aliceView = buildPlayingViewFor({
      state,
      recipientSessionId: alice.id,
      gameCode: 'TEST01',
      turnDeadlineMs: null,
      actionLog: [],
    });
    const bobView = buildPlayingViewFor({
      state,
      recipientSessionId: 'b',
      gameCode: 'TEST01',
      turnDeadlineMs: null,
      actionLog: [],
    });

    const alicePublic = aliceView.players.find((p) => p.id === 'a');
    const aliceOnBob = bobView.players.find((p) => p.id === 'a');
    expect(alicePublic?.activeAttackBlock).toBe(true);
    expect(aliceOnBob?.activeAttackBlock).toBe(true);
    expect(aliceView.self.attackBlockCharges).toBe(2);
    expect(
      Object.prototype.hasOwnProperty.call(bobView.self, 'attackBlockCharges'),
    ).toBe(true);
    expect(bobView.self.attackBlockCharges).toBe(0);
  });

  it('empty victim steal resolves as a no-op', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l23-03-empty',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing players');
    }

    alice.points = 8;
    alice.hand = [];
    alice.specialCards = [
      { instanceId: 'at-1', cardId: 'attack-thief', isUpgraded: false },
    ];
    bob.hand = [];
    bob.specialCards = [];
    for (const player of state.players) {
      player.pendingEffects = [];
    }

    state.currentTurnPlayerId = alice.id;
    expect(
      performTurnAction(state, alice.id, { type: 'playCard', instanceId: 'at-1' }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = bob.id;
    expect(performTurnAction(state, bob.id, { type: 'draw' }).ok).toBe(true);
    expect(alice.hand).toHaveLength(0);
    expect(alice.attackBlockCharges).toBe(1);
  });
});
