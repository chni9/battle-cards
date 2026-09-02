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

  it('incoming stronger: weaker answer stays pending; incoming applies this turn', () => {
    const state = twoPlayers('mutual-incoming-stronger');
    const alice = requirePlayer(state, 'a');
    const bob = requirePlayer(state, 'b');

    alice.lives = 20;
    bob.lives = 20;

    // A → B super (7), B → A basic (1). On B's turn Super applies; Basic stays for Alice.
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
    expect(alice.pendingEffects).toHaveLength(1);
    expect(alice.pendingEffects[0]?.cardId).toBe('basic-attack');
    expect(alice.lives).toBe(20);

    state.currentTurnPlayerId = alice.id;
    const onAlice = performTurnAction(state, alice.id, { type: 'draw' });

    expect(onAlice.ok).toBe(true);
    expect(alice.lives).toBe(19);
    expect(alice.pendingEffects).toHaveLength(0);
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
  });

  it('cancels equal final damage across different cards (Mirror-doubled basic vs strong) (#V4-2 / L20-07)', () => {
    const state = twoPlayers('mutual-final-dmg-equal');
    const alice = requirePlayer(state, 'a');
    const bob = requirePlayer(state, 'b');

    alice.lives = 10;
    bob.lives = 10;

    const incoming = queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    // Mirror redirect doubles damage — final damage 2, same as strong.
    incoming.damageMultiplier = 2;

    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'strong-attack',
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

  it('cancels the weaker when final damage is unequal (#V4-2 / L20-07)', () => {
    const state = twoPlayers('mutual-final-dmg-unequal');
    const alice = requirePlayer(state, 'a');
    const bob = requirePlayer(state, 'b');

    alice.lives = 20;
    bob.lives = 20;

    const incoming = queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    incoming.damageMultiplier = 2; // final 2

    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'super-attack',
      isUpgraded: false,
    }); // final 7

    state.currentTurnPlayerId = bob.id;
    const bobPlay = performTurnAction(state, bob.id, { type: 'draw' });
    expect(bobPlay.ok).toBe(true);
    expect(bob.lives).toBe(20);
    expect(bob.pendingEffects).toHaveLength(0);
    expect(alice.pendingEffects.some((e) => e.cardId === 'super-attack')).toBe(true);

    state.currentTurnPlayerId = alice.id;
    const aliceDraw = performTurnAction(state, alice.id, { type: 'draw' });
    expect(aliceDraw.ok).toBe(true);
    expect(alice.lives).toBe(13);
  });

  it('same-action incoming volley sums vs a weaker answer and both sides persist (L54-02)', () => {
    // Two Alice→Bob basics share queuedAt (one Assassin volley). Bob answers with one Basic.
    // Incoming 2 > 1: both basics apply; Bob's weaker answer stays for Alice.
    const state = twoPlayers('mutual-volley-weaker-answer');
    const alice = requirePlayer(state, 'a');
    const bob = requirePlayer(state, 'b');

    alice.lives = 20;
    bob.lives = 20;

    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
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
    expect(bob.lives).toBe(18);
    expect(alice.lives).toBe(20);
    expect(alice.pendingEffects).toHaveLength(1);
    expect(alice.pendingEffects[0]?.cardId).toBe('basic-attack');
    expect(bob.pendingEffects).toHaveLength(0);
  });

  it('separate-turn incoming hits still pair one-for-one with the latest answer', () => {
    const state = twoPlayers('mutual-separate-queuedAt');
    const alice = requirePlayer(state, 'a');
    const bob = requirePlayer(state, 'b');

    alice.lives = 20;
    bob.lives = 20;

    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });
    state.turnSequence += 1;
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
    // Oldest incoming (1) vs latest answer (1) equal-cancel; the later incoming applies.
    expect(bob.lives).toBe(19);
    expect(alice.pendingEffects).toHaveLength(0);
    expect(bob.pendingEffects).toHaveLength(0);
  });

  it('four basics equal-cancel upgraded Strong as one volley (L54-02)', () => {
    const state = twoPlayers('mutual-volley-equal-strong');
    const alice = requirePlayer(state, 'a');
    const bob = requirePlayer(state, 'b');

    alice.lives = 20;
    bob.lives = 20;

    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'strong-attack',
      isUpgraded: true,
    });

    for (let i = 0; i < 4; i += 1) {
      queueEffect({
        state,
        sourcePlayerId: bob.id,
        targetPlayerId: alice.id,
        cardId: 'basic-attack',
        isUpgraded: false,
      });
    }

    state.currentTurnPlayerId = bob.id;
    const result = performTurnAction(state, bob.id, { type: 'draw' });
    expect(result.ok).toBe(true);
    expect(bob.lives).toBe(20);
    expect(alice.lives).toBe(20);
    expect(alice.pendingEffects).toHaveLength(0);
    expect(bob.pendingEffects).toHaveLength(0);
  });

  it('Super cannot cancel a 20-basic answer volley (L54-02)', () => {
    const state = twoPlayers('mutual-volley-super-vs-20');
    const alice = requirePlayer(state, 'a');
    const bob = requirePlayer(state, 'b');

    alice.lives = 20;
    bob.lives = 25;

    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'super-attack',
      isUpgraded: false,
    });

    for (let i = 0; i < 20; i += 1) {
      queueEffect({
        state,
        sourcePlayerId: bob.id,
        targetPlayerId: alice.id,
        cardId: 'basic-attack',
        isUpgraded: false,
      });
    }

    state.currentTurnPlayerId = bob.id;
    const result = performTurnAction(state, bob.id, { type: 'draw' });
    expect(result.ok).toBe(true);
    expect(bob.lives).toBe(25);
    expect(alice.pendingEffects).toHaveLength(20);
    expect(bob.pendingEffects).toHaveLength(0);

    state.currentTurnPlayerId = alice.id;
    const onAlice = performTurnAction(state, alice.id, { type: 'draw' });
    expect(onAlice.ok).toBe(true);
    expect(alice.lives).toBe(0);
  });

  it('mixed 2 basic + 1 strong volley equal-cancels upgraded Strong', () => {
    const state = twoPlayers('mutual-volley-mixed');
    const alice = requirePlayer(state, 'a');
    const bob = requirePlayer(state, 'b');

    alice.lives = 20;
    bob.lives = 20;

    queueEffect({
      state,
      sourcePlayerId: alice.id,
      targetPlayerId: bob.id,
      cardId: 'strong-attack',
      isUpgraded: true,
    });
    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
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
    queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'strong-attack',
      isUpgraded: false,
    });

    state.currentTurnPlayerId = bob.id;
    const result = performTurnAction(state, bob.id, { type: 'draw' });
    expect(result.ok).toBe(true);
    expect(bob.lives).toBe(20);
    expect(alice.pendingEffects).toHaveLength(0);
  });
});
