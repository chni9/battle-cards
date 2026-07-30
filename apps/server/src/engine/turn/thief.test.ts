/**
 * Thief — rules spec §3, backlog L3-04.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Thief (rules spec §3, L3-04)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('steals capped at the target amount (3, not 10)', () => {
    const state = createInitialState({ seats, seed: 'thief-cap' });
    const attackerId = state.currentTurnPlayerId;

    expect(attackerId).not.toBeNull();

    if (attackerId === null) {
      return;
    }

    const attacker = state.players.find((player) => player.id === attackerId);
    const target = state.players.find((player) => player.id !== attackerId);

    expect(attacker).toBeDefined();
    expect(target).toBeDefined();

    if (attacker === undefined || target === undefined) {
      return;
    }

    attacker.points = 5;
    attacker.hand = [{ instanceId: 'th-1', cardId: 'thief', isUpgraded: false }];
    target.kitId = 'kamikaze';
    // Target will draw (+1) before resolve; start at 2 so resolve sees 3.
    target.points = 2;

    const play = performTurnAction(state, attackerId, {
      type: 'playCard',
      instanceId: 'th-1',
      targetPlayerId: target.id,
    });

    expect(play.ok).toBe(true);
    expect(target.pendingEffects).toHaveLength(1);
    expect(attacker.points).toBe(0);

    state.currentTurnPlayerId = target.id;
    const resolve = performTurnAction(state, target.id, { type: 'draw' });

    expect(resolve.ok).toBe(true);
    expect(target.points).toBe(0);
    expect(attacker.points).toBe(3);
    expect(target.turnLedger.pointsLostToTheft).toBe(3);
    expect(target.turnLedger.pointsSpent).toBe(0);
  });

  it('upgraded: target loses capped amount, thief gains double', () => {
    const state = createInitialState({ seats, seed: 'thief-up' });
    const attackerId = state.currentTurnPlayerId;

    expect(attackerId).not.toBeNull();

    if (attackerId === null) {
      return;
    }

    const attacker = state.players.find((player) => player.id === attackerId);
    const target = state.players.find((player) => player.id !== attackerId);

    expect(attacker).toBeDefined();
    expect(target).toBeDefined();

    if (attacker === undefined || target === undefined) {
      return;
    }

    attacker.points = 5;
    attacker.hand = [{ instanceId: 'th-1', cardId: 'thief', isUpgraded: true }];
    target.kitId = 'kamikaze';
    // Draw +1 before resolve → 10 at steal time.
    target.points = 9;

    performTurnAction(state, attackerId, {
      type: 'playCard',
      instanceId: 'th-1',
      targetPlayerId: target.id,
    });

    state.currentTurnPlayerId = target.id;
    performTurnAction(state, target.id, { type: 'draw' });

    expect(target.points).toBe(0);
    expect(attacker.points).toBe(20);
    expect(target.turnLedger.pointsLostToTheft).toBe(10);
  });

  it('fizzles against an active upgraded shield (no steal, no shield spend)', () => {
    const state = createInitialState({ seats, seed: 'thief-shield' });
    const attackerId = state.currentTurnPlayerId;

    expect(attackerId).not.toBeNull();

    if (attackerId === null) {
      return;
    }

    const attacker = state.players.find((player) => player.id === attackerId);
    const target = state.players.find((player) => player.id !== attackerId);

    expect(attacker).toBeDefined();
    expect(target).toBeDefined();

    if (attacker === undefined || target === undefined) {
      return;
    }

    attacker.points = 5;
    attacker.hand = [{ instanceId: 'th-1', cardId: 'thief', isUpgraded: false }];
    target.kitId = 'kamikaze';
    target.points = 9;
    target.shield = 7;
    target.shieldIsUpgraded = true;

    performTurnAction(state, attackerId, {
      type: 'playCard',
      instanceId: 'th-1',
      targetPlayerId: target.id,
    });

    state.currentTurnPlayerId = target.id;
    performTurnAction(state, target.id, { type: 'draw' });

    expect(target.points).toBe(10);
    expect(attacker.points).toBe(0);
    expect(target.shield).toBe(7);
    expect(target.turnLedger.pointsLostToTheft).toBe(0);
  });
});
