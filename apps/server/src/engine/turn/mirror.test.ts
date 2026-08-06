/**
 * Mirror — rules spec §3, tech §5.5–5.6, backlog L3-09.
 */

import { describe, expect, it } from 'vitest';

import { createRng } from '../rng';
import { createInitialState } from '../create-initial-state';
import {
  completeMirrorChoice,
  expireMirrorChoice,
  performTurnAction,
} from './perform-action';

describe('Mirror (rules spec §3, L3-09)', () => {
  it('rejects Mirror when nothing eligible is pending', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'mirror-invalid',
    });
    state.currentTurnPlayerId = 'a';
    const alice = state.players.find((player) => player.id === 'a');

    expect(alice).toBeDefined();

    if (alice === undefined) {
      return;
    }

    alice.points = 6;
    alice.hand = [{ instanceId: 'm-1', cardId: 'mirror', isUpgraded: false }];

    const result = performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'm-1',
    });

    expect(result.ok).toBe(false);
    expect(alice.points).toBe(6);
  });

  it('redirects a pending attack; mutual cancel treats it as Mirror user attack (rules §6)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'mirror-chain',
    });

    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    expect(carol).toBeDefined();

    if (alice === undefined || bob === undefined || carol === undefined) {
      return;
    }

    // A and B both Super-attack C. C Mirrors A's onto B → mutual cancel B↔C.
    state.currentTurnPlayerId = 'a';
    alice.points = 10;
    alice.hand = [{ instanceId: 'atk-a', cardId: 'super-attack', isUpgraded: false }];
    performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'atk-a',
      targetPlayerId: 'c',
    });

    state.currentTurnPlayerId = 'b';
    bob.points = 10;
    bob.hand = [{ instanceId: 'atk-b', cardId: 'super-attack', isUpgraded: false }];
    performTurnAction(state, 'b', {
      type: 'playCard',
      instanceId: 'atk-b',
      targetPlayerId: 'c',
    });

    state.currentTurnPlayerId = 'c';
    carol.points = 6;
    carol.lives = 10;
    carol.hand = [{ instanceId: 'm-1', cardId: 'mirror', isUpgraded: false }];
    const aAttack = carol.pendingEffects.find((e) => e.sourcePlayerId === 'a');
    const bAttackId = carol.pendingEffects.find((e) => e.sourcePlayerId === 'b')?.id;

    expect(aAttack).toBeDefined();
    expect(bAttackId).toBeDefined();

    if (aAttack === undefined || bAttackId === undefined) {
      return;
    }

    const mirrorPlay = performTurnAction(state, 'c', {
      type: 'playCard',
      instanceId: 'm-1',
    });

    expect(mirrorPlay.ok).toBe(true);

    if (!mirrorPlay.ok) {
      return;
    }

    expect(mirrorPlay.mirrorChoicePending).toBe(true);

    const livesBefore = { bob: bob.lives, carol: carol.lives };
    const choice = completeMirrorChoice(state, 'c', aAttack.id, 'b');

    expect(choice.ok).toBe(true);
    // finishTurnPhases already ran: redirected A→B is attributed to C and mutual-cancelled
    // against B→C on Carol's resolve.
    expect(carol.pendingEffects.some((e) => e.id === aAttack.id)).toBe(false);
    expect(carol.pendingEffects.some((e) => e.id === bAttackId)).toBe(false);
    expect(bob.pendingEffects.some((e) => e.id === aAttack.id)).toBe(false);
    expect(bob.lives).toBe(livesBefore.bob);
    expect(carol.lives).toBe(livesBefore.carol);
  });

  it('Mirror user is the eliminator when a redirected attack kills', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'mirror-elim-attribution',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');

    if (alice === undefined || bob === undefined || carol === undefined) {
      throw new Error('missing players');
    }

    state.currentTurnPlayerId = 'a';
    alice.points = 10;
    alice.hand = [{ instanceId: 'atk-a', cardId: 'super-attack', isUpgraded: false }];
    performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'atk-a',
      targetPlayerId: 'c',
    });

    state.currentTurnPlayerId = 'c';
    carol.points = 6;
    carol.hand = [{ instanceId: 'm-1', cardId: 'mirror', isUpgraded: false }];
    const pending = carol.pendingEffects.find((e) => e.sourcePlayerId === 'a');
    expect(pending).toBeDefined();

    if (pending === undefined) {
      return;
    }

    expect(
      performTurnAction(state, 'c', { type: 'playCard', instanceId: 'm-1' }).ok,
    ).toBe(true);
    bob.lives = 3;
    bob.shield = 0;
    expect(completeMirrorChoice(state, 'c', pending.id, 'b').ok).toBe(true);

    // Seat order is seed-shuffled — advance every other seat until Bob resolves.
    for (let guard = 0; guard < 6 && !bob.isEliminated; guard += 1) {
      const actorId = state.currentTurnPlayerId;
      const actor = state.players.find((player) => player.id === actorId);

      if (actor === undefined || actor.isEliminated) {
        break;
      }

      actor.points = Math.max(actor.points, 0);
      expect(performTurnAction(state, actorId, { type: 'draw' }).ok).toBe(true);
    }

    expect(bob.isEliminated).toBe(true);
    expect(state.rewardChoice?.eliminatorPlayerId).toBe('c');
  });

  it('upgraded Mirror stacks damageMultiplier', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'mirror-double',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    expect(carol).toBeDefined();

    if (alice === undefined || bob === undefined || carol === undefined) {
      return;
    }

    state.currentTurnPlayerId = 'a';
    alice.points = 1;
    alice.hand = [{ instanceId: 'atk-a', cardId: 'basic-attack', isUpgraded: false }];
    performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'atk-a',
      targetPlayerId: 'c',
    });

    state.currentTurnPlayerId = 'c';
    const pending = carol.pendingEffects[0];

    expect(pending).toBeDefined();

    if (pending === undefined) {
      return;
    }

    carol.points = 6;
    carol.hand = [{ instanceId: 'm-1', cardId: 'mirror', isUpgraded: true }];
    performTurnAction(state, 'c', { type: 'playCard', instanceId: 'm-1' });
    completeMirrorChoice(state, 'c', pending.id, 'b');

    const redirected = bob.pendingEffects.find((e) => e.id === pending.id);

    expect(redirected?.damageMultiplier).toBe(2);
    expect(redirected?.sourcePlayerId).toBe('c');

    // Second upgraded redirect by Bob stacks to 4; source becomes Bob.
    state.currentTurnPlayerId = 'b';
    bob.points = 6;
    bob.hand = [{ instanceId: 'm-2', cardId: 'mirror', isUpgraded: true }];
    performTurnAction(state, 'b', { type: 'playCard', instanceId: 'm-2' });
    completeMirrorChoice(state, 'b', pending.id, 'a');

    const again = alice.pendingEffects.find((e) => e.id === pending.id);

    expect(again?.damageMultiplier).toBe(4);
    expect(again?.sourcePlayerId).toBe('b');
  });

  it('default on expiry redirects first eligible to a random opponent', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'mirror-default',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const carol = state.players.find((player) => player.id === 'c');

    expect(alice).toBeDefined();
    expect(carol).toBeDefined();

    if (alice === undefined || carol === undefined) {
      return;
    }

    state.currentTurnPlayerId = 'a';
    alice.points = 1;
    alice.hand = [{ instanceId: 'atk-a', cardId: 'basic-attack', isUpgraded: false }];
    performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'atk-a',
      targetPlayerId: 'c',
    });

    const pendingId = carol.pendingEffects[0]?.id;

    expect(pendingId).toBeDefined();

    state.currentTurnPlayerId = 'c';
    carol.points = 6;
    carol.hand = [{ instanceId: 'm-1', cardId: 'mirror', isUpgraded: false }];
    performTurnAction(state, 'c', { type: 'playCard', instanceId: 'm-1' });

    const expired = expireMirrorChoice(state, createRng('mirror-default'));

    expect(expired.ok).toBe(true);
    expect(state.mirrorChoice).toBeNull();
    expect(carol.pendingEffects.some((e) => e.id === pendingId)).toBe(false);
    expect(
      state.players.some(
        (player) =>
          player.id !== 'c' && player.pendingEffects.some((e) => e.id === pendingId),
      ),
    ).toBe(true);

    const redirected = state.players
      .flatMap((player) => player.pendingEffects)
      .find((e) => e.id === pendingId);
    expect(redirected?.sourcePlayerId).toBe('c');
  });
});
