/**
 * Mutual attacks — technical spec §4.6 / Lot 19 (stronger cancels weaker).
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';
import { queueEffect } from './queue-effect';

describe('mutual attacks (technical spec §4.6, L19-01)', () => {
  function twoPlayers(seed: string) {
    return createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed,
    });
  }

  function requirePlayer(
    state: ReturnType<typeof twoPlayers>,
    id: string,
  ): (typeof state.players)[number] {
    const player = state.players.find((entry) => entry.id === id);

    if (player === undefined) {
      throw new Error(`missing ${id}`);
    }

    return player;
  }

  it('cancels both attacks when equal damage on the retaliator turn', () => {
    const state = twoPlayers('mutual-equal');
    const alice = requirePlayer(state, 'a');
    const bob = requirePlayer(state, 'b');

    alice.lives = 10;
    bob.lives = 10;

    // A → B basic (dmg 1), B → A basic (dmg 1). Resolve on B's turn.
    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    state.currentTurnPlayerId = bob.id;
    const result = performTurnAction(state, bob.id, { type: 'draw' });

    expect(result.ok).toBe(true);
    expect(bob.lives).toBe(10);
    expect(alice.lives).toBe(10);
    expect(bob.pendingEffects).toHaveLength(0);
    expect(alice.pendingEffects).toHaveLength(0);
  });

  it('retaliation stronger: cancels weaker incoming; stronger resolves on target turn', () => {
    const state = twoPlayers('mutual-retaliation-stronger');
    const alice = requirePlayer(state, 'a');
    const bob = requirePlayer(state, 'b');

    alice.lives = 20;
    bob.lives = 20;

    // A → B basic (1), B → A strong (2). On B's turn Basic is cancelled; Strong stays.
    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'strong-attack',
      isUpgraded: false,
    });

    state.currentTurnPlayerId = bob.id;
    const onBob = performTurnAction(state, bob.id, { type: 'draw' });

    expect(onBob.ok).toBe(true);
    if (!onBob.ok) {
      return;
    }
    expect(onBob.resolved.some((r) => r.outcome === 'cancelled')).toBe(true);
    expect(bob.lives).toBe(20);
    expect(alice.pendingEffects).toHaveLength(1);
    expect(alice.pendingEffects[0]?.cardId).toBe('strong-attack');
    expect(alice.lives).toBe(20);

    state.currentTurnPlayerId = alice.id;
    const onAlice = performTurnAction(state, alice.id, { type: 'draw' });

    expect(onAlice.ok).toBe(true);
    expect(alice.lives).toBe(18);
    expect(alice.pendingEffects).toHaveLength(0);
  });

  it('incoming stronger: cancels weaker retaliation; incoming applies this turn', () => {
    const state = twoPlayers('mutual-incoming-stronger');
    const alice = requirePlayer(state, 'a');
    const bob = requirePlayer(state, 'b');

    alice.lives = 20;
    bob.lives = 20;

    // A → B super (7), B → A basic (1). On B's turn Basic is dropped; Super applies to Bob.
    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'super-attack',
      isUpgraded: false,
    });
    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    state.currentTurnPlayerId = bob.id;
    const onBob = performTurnAction(state, bob.id, { type: 'draw' });

    expect(onBob.ok).toBe(true);
    expect(bob.lives).toBe(13);
    expect(alice.pendingEffects).toHaveLength(0);
    expect(alice.lives).toBe(20);
  });

  it('strong vs super via playCard: Strong cancelled; Super resolves on Alice turn', () => {
    const state = twoPlayers('mutual-strong-super');
    const alice = requirePlayer(state, 'a');
    const bob = requirePlayer(state, 'b');

    alice.lives = 20;
    bob.lives = 20;
    alice.points = 10;
    bob.points = 10;
    alice.hand = [{ instanceId: 'strong-1', cardId: 'strong-attack', isUpgraded: false }];
    bob.hand = [{ instanceId: 'super-1', cardId: 'super-attack', isUpgraded: false }];

    state.currentTurnPlayerId = alice.id;
    const alicePlay = performTurnAction(state, alice.id, {
      type: 'playCard',
      instanceId: 'strong-1',
      targetPlayerId: bob.id,
    });
    expect(alicePlay.ok).toBe(true);
    if (!alicePlay.ok) {
      return;
    }
    expect(alicePlay.resolved.every((r) => r.outcome !== 'cancelled')).toBe(true);
    expect(bob.pendingEffects.some((e) => e.cardId === 'strong-attack')).toBe(true);

    state.currentTurnPlayerId = bob.id;
    const bobPlay = performTurnAction(state, bob.id, {
      type: 'playCard',
      instanceId: 'super-1',
      targetPlayerId: alice.id,
    });
    expect(bobPlay.ok).toBe(true);
    if (!bobPlay.ok) {
      return;
    }
    // Strong (2) vs Super (7): Strong cancelled; Bob takes no damage; Super stays for Alice.
    expect(bobPlay.resolved.some((r) => r.outcome === 'cancelled')).toBe(true);
    expect(bob.lives).toBe(20);
    expect(alice.pendingEffects.some((e) => e.cardId === 'super-attack')).toBe(true);
    expect(bob.pendingEffects.some((e) => e.cardId === 'strong-attack')).toBe(false);
    expect(alice.lives).toBe(20);

    state.currentTurnPlayerId = alice.id;
    const aliceDraw = performTurnAction(state, alice.id, { type: 'draw' });
    expect(aliceDraw.ok).toBe(true);
    if (!aliceDraw.ok) {
      return;
    }
    expect(aliceDraw.resolved.some((r) => r.outcome === 'cancelled')).toBe(false);
    expect(alice.lives).toBe(13);
    expect(alice.pendingEffects).toHaveLength(0);
  });

  it('does not cancel when two players attack a third (no reciprocity)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'mutual-3p',
    });

    const alice = requirePlayer(state, 'a');
    const bob = requirePlayer(state, 'b');
    const carol = requirePlayer(state, 'c');

    carol.lives = 20;

    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: carol.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: carol.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    state.currentTurnPlayerId = carol.id;
    const result = performTurnAction(state, carol.id, { type: 'draw' });

    expect(result.ok).toBe(true);
    expect(carol.lives).toBe(18);
    expect(carol.pendingEffects).toHaveLength(0);
    expect(alice.pendingEffects).toHaveLength(0);
    expect(bob.pendingEffects).toHaveLength(0);
  });
});
