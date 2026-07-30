/**
 * Tax — rules spec §3, backlog L3-01.
 * applyLifeLoss only; shield and counters never intervene.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Tax (rules spec §3, L3-01)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('base: loses 1 life ignoring shield and counters, gains 4 points', () => {
    const state = createInitialState({ seats, seed: 'tax-base' });
    const actorId = state.currentTurnPlayerId;

    expect(actorId).not.toBeNull();

    if (actorId === null) {
      return;
    }

    const actor = state.players.find((player) => player.id === actorId);

    expect(actor).toBeDefined();

    if (actor === undefined) {
      return;
    }

    actor.lives = 10;
    actor.points = 0;
    actor.shield = 7;
    actor.activePersistentEffects = [makeCounterEffect({ counter: 3 })];
    actor.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];

    const result = performTurnAction(state, actorId, {
      type: 'playCard',
      instanceId: 'tax-1',
    });

    expect(result.ok).toBe(true);
    expect(actor.lives).toBe(9);
    expect(actor.points).toBe(4);
    expect(actor.shield).toBe(7);
    expect(actor.activePersistentEffects[0]?.counter).toBe(3);
    expect(actor.turnLedger.livesLost).toBe(1);
    expect(actor.hand.some((card) => card.instanceId === 'tax-1')).toBe(true);
  });

  it('upgraded: gains 6 points for the same 1 life', () => {
    const state = createInitialState({ seats, seed: 'tax-upgraded' });
    const actorId = state.currentTurnPlayerId;

    expect(actorId).not.toBeNull();

    if (actorId === null) {
      return;
    }

    const actor = state.players.find((player) => player.id === actorId);

    expect(actor).toBeDefined();

    if (actor === undefined) {
      return;
    }

    actor.lives = 10;
    actor.points = 0;
    actor.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: true }];

    const result = performTurnAction(state, actorId, {
      type: 'playCard',
      instanceId: 'tax-1',
    });

    expect(result.ok).toBe(true);
    expect(actor.lives).toBe(9);
    expect(actor.points).toBe(6);
  });

  it('rejects Tax played with a target', () => {
    const state = createInitialState({ seats, seed: 'tax-target' });
    const actorId = state.currentTurnPlayerId;

    expect(actorId).not.toBeNull();

    if (actorId === null) {
      return;
    }

    const actor = state.players.find((player) => player.id === actorId);
    const other = state.players.find((player) => player.id !== actorId);

    expect(actor).toBeDefined();
    expect(other).toBeDefined();

    if (actor === undefined || other === undefined) {
      return;
    }

    actor.lives = 10;
    actor.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];

    const result = performTurnAction(state, actorId, {
      type: 'playCard',
      instanceId: 'tax-1',
      targetPlayerId: other.id,
    });

    expect(result.ok).toBe(false);
    expect(actor.lives).toBe(10);
    expect(actor.points).toBe(0);
  });

  it('a 1-life player reaches 0 lives (elimination without inventing rewards)', () => {
    const state = createInitialState({ seats, seed: 'tax-self-elim' });
    const actorId = state.currentTurnPlayerId;

    expect(actorId).not.toBeNull();

    if (actorId === null) {
      return;
    }

    const actor = state.players.find((player) => player.id === actorId);

    expect(actor).toBeDefined();

    if (actor === undefined) {
      return;
    }

    actor.lives = 1;
    actor.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];

    const result = performTurnAction(state, actorId, {
      type: 'playCard',
      instanceId: 'tax-1',
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(actor.lives).toBe(0);
    expect(actor.isEliminated).toBe(true);
    expect(result.eliminatedPlayerIds).toContain(actorId);
  });
});
