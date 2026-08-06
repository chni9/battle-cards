/**
 * MEGA ATTACK — rules spec §5, backlog L23-01.
 */

import {
  ATTACK_CARD_IDS,
  isAttackCardId,
  isSharedAttackCardId,
} from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { listAssassinMultiAttackCandidates } from './assassin-candidates';
import { listEligibleMirrorTargets } from './mirror-choice';
import { performTurnAction } from './perform-action';

describe('MEGA ATTACK (L23-01)', () => {
  it('queues one pending attack per alive opponent for 2, 3 and 4 players (#V4-1)', () => {
    for (const seatCount of [2, 3, 4] as const) {
      const seats = Array.from({ length: seatCount }, (_, index) => ({
        id: String.fromCodePoint(97 + index),
        nickname: `P${String(index)}`,
      }));
      const state = createInitialState({
        seats,
        seed: `l23-01-queue-${String(seatCount)}`,
      });
      const actor = state.players.find((player) => player.id === 'a');

      if (actor === undefined) {
        throw new Error('missing actor');
      }

      actor.points = 16;
      actor.specialCards = [
        { instanceId: 'mega-1', cardId: 'mega-attack', isUpgraded: false },
      ];
      actor.pendingEffects = [];
      for (const player of state.players) {
        player.pendingEffects = [];
      }
      state.currentTurnPlayerId = actor.id;

      expect(
        performTurnAction(state, actor.id, { type: 'playCard', instanceId: 'mega-1' }).ok,
      ).toBe(true);

      expect(actor.pendingEffects).toHaveLength(0);
      const opponentIds = state.players
        .filter((player) => player.id !== actor.id)
        .map((player) => player.id);
      expect(opponentIds).toHaveLength(seatCount - 1);

      for (const opponentId of opponentIds) {
        const opponent = state.players.find((player) => player.id === opponentId);
        if (opponent === undefined) {
          throw new Error(`missing ${opponentId}`);
        }
        expect(opponent.pendingEffects).toHaveLength(1);
        const pending = opponent.pendingEffects[0];
        expect(pending?.cardId).toBe('mega-attack');
        expect(pending?.sourcePlayerId).toBe(actor.id);
        expect(pending?.targetPlayerId).toBe(opponentId);
        expect(pending?.isUpgraded).toBe(false);
      }
    }
  });

  it('applies 20 damage through the shield on the target turn', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l23-01-shield',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing players');
    }

    alice.points = 16;
    alice.specialCards = [
      { instanceId: 'mega-1', cardId: 'mega-attack', isUpgraded: false },
    ];
    alice.pendingEffects = [];
    bob.lives = 10;
    bob.shield = 20;
    bob.shieldIsUpgraded = false;
    bob.pendingEffects = [];
    state.currentTurnPlayerId = alice.id;

    expect(
      performTurnAction(state, alice.id, { type: 'playCard', instanceId: 'mega-1' }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = bob.id;
    const result = performTurnAction(state, bob.id, { type: 'draw' });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(bob.lives).toBe(10);
    expect(bob.shield).toBe(0);
    expect(result.resolved.some((entry) => entry.shieldAbsorbed === 20)).toBe(true);
  });

  it('base MEGA is Mirror-eligible only when Mirror is upgraded; upgraded MEGA never', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l23-01-redirect',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing players');
    }

    alice.points = 16;
    alice.specialCards = [
      { instanceId: 'mega-base', cardId: 'mega-attack', isUpgraded: false },
    ];
    for (const player of state.players) {
      player.pendingEffects = [];
    }
    state.currentTurnPlayerId = alice.id;
    expect(
      performTurnAction(state, alice.id, { type: 'playCard', instanceId: 'mega-base' }).ok,
    ).toBe(true);

    bob.pendingEffects.push({
      id: 'forced-up-mega',
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'mega-attack',
      isUpgraded: true,
      queuedAt: state.turnSequence,
      damageMultiplier: 1,
      redirectedBy: null,
      chosenInstanceId: null,
    });

    expect(listEligibleMirrorTargets(bob, false).map((e) => e.cardId)).toEqual([]);
    expect(listEligibleMirrorTargets(bob, true).map((e) => e.isUpgraded)).toEqual([false]);
  });

  it('two MEGAs facing each other pair independently per target (#V4-3)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'l23-01-mutual-mega',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');

    if (alice === undefined || bob === undefined || carol === undefined) {
      throw new Error('missing players');
    }

    alice.lives = 25;
    bob.lives = 25;
    carol.lives = 25;
    alice.points = 16;
    bob.points = 16;
    alice.specialCards = [
      { instanceId: 'mega-a', cardId: 'mega-attack', isUpgraded: false },
    ];
    bob.specialCards = [
      { instanceId: 'mega-b', cardId: 'mega-attack', isUpgraded: false },
    ];
    for (const player of state.players) {
      player.pendingEffects = [];
    }

    state.currentTurnPlayerId = alice.id;
    expect(
      performTurnAction(state, alice.id, { type: 'playCard', instanceId: 'mega-a' }).ok,
    ).toBe(true);
    expect(bob.pendingEffects).toHaveLength(1);
    expect(carol.pendingEffects).toHaveLength(1);

    state.currentTurnPlayerId = bob.id;
    expect(
      performTurnAction(state, bob.id, { type: 'playCard', instanceId: 'mega-b' }).ok,
    ).toBe(true);

    // On Bob's turn: Alice→Bob and Bob→Alice cancel (equal 20). Alice→Carol and
    // Bob→Carol stay on Carol; Bob→Alice was the retaliation that got cancelled.
    expect(bob.lives).toBe(25);
    expect(bob.pendingEffects).toHaveLength(0);
    expect(alice.pendingEffects).toHaveLength(0);
    expect(carol.pendingEffects).toHaveLength(2);
    expect(carol.pendingEffects.map((e) => e.sourcePlayerId).sort()).toEqual(['a', 'b']);

    state.currentTurnPlayerId = carol.id;
    const onCarol = performTurnAction(state, carol.id, { type: 'draw' });
    expect(onCarol.ok).toBe(true);
    // 25 − 20 − 20 clamps at 0 via applyDamage.
    expect(carol.lives).toBe(0);
    expect(carol.pendingEffects).toHaveLength(0);
  });

  it('two MEGAs cancel in a 2-player mutual pair (equal 20)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l23-01-mutual-mega-2p',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing players');
    }

    alice.lives = 25;
    bob.lives = 25;
    alice.points = 16;
    bob.points = 16;
    alice.specialCards = [
      { instanceId: 'mega-a', cardId: 'mega-attack', isUpgraded: false },
    ];
    bob.specialCards = [
      { instanceId: 'mega-b', cardId: 'mega-attack', isUpgraded: true },
    ];
    for (const player of state.players) {
      player.pendingEffects = [];
    }

    state.currentTurnPlayerId = alice.id;
    expect(
      performTurnAction(state, alice.id, { type: 'playCard', instanceId: 'mega-a' }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = bob.id;
    const result = performTurnAction(state, bob.id, {
      type: 'playCard',
      instanceId: 'mega-b',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.resolved).toEqual([
      expect.objectContaining({
        cardId: 'mega-attack',
        sourcePlayerId: 'a',
        targetPlayerId: 'b',
        outcome: 'cancelled',
        livesLost: 0,
      }),
    ]);
    expect(alice.lives).toBe(25);
    expect(bob.lives).toBe(25);
    expect(alice.pendingEffects).toHaveLength(0);
    expect(bob.pendingEffects).toHaveLength(0);
  });

  it('Assassin multi-attack never lists or accepts mega-attack (#V4-32)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l23-01-assassin',
    });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      throw new Error('missing actor');
    }

    actor.kitId = 'assassin';
    actor.points = 100;
    actor.hand = [
      { instanceId: 'a1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'a2', cardId: 'strong-attack', isUpgraded: false },
      { instanceId: 'mega', cardId: 'mega-attack', isUpgraded: false },
    ];
    actor.specialCards = [
      { instanceId: 'mega-s', cardId: 'mega-attack', isUpgraded: false },
    ];

    const candidates = listAssassinMultiAttackCandidates(state, actor);
    for (const action of candidates) {
      expect(action.type).toBe('playMultipleAttacks');
      if (action.type !== 'playMultipleAttacks') {
        continue;
      }
      expect(action.attacks.every((slot) => slot.instanceId !== 'mega')).toBe(true);
      expect(action.attacks.every((slot) => slot.instanceId !== 'mega-s')).toBe(true);
    }

    state.currentTurnPlayerId = actor.id;
    const rejected = performTurnAction(state, actor.id, {
      type: 'playMultipleAttacks',
      attacks: [
        { instanceId: 'a1', targetPlayerId: 'b' },
        { instanceId: 'mega', targetPlayerId: 'b' },
      ],
    });
    expect(rejected.ok).toBe(false);
  });

  it('is not a shared shop / starting-deal attack id', () => {
    expect(isAttackCardId('mega-attack')).toBe(true);
    expect(isSharedAttackCardId('mega-attack')).toBe(false);
    expect((ATTACK_CARD_IDS as readonly string[]).includes('mega-attack')).toBe(false);
  });
});
