/**
 * Shield — rules spec §3, backlog L3-03.
 */

import { describe, expect, it } from 'vitest';

import { applyDamage } from '../life/apply-damage';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Shield (rules spec §3, L3-03)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('base: grants 4 shield points and clears upgraded flag', () => {
    const state = createInitialState({ seats, seed: 'shield-base' });
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

    actor.points = 7;
    actor.hand = [{ instanceId: 'sh-1', cardId: 'shield', isUpgraded: false }];

    const result = performTurnAction(state, actorId, {
      type: 'playCard',
      instanceId: 'sh-1',
    });

    expect(result.ok).toBe(true);
    expect(actor.shield).toBe(4);
    expect(actor.shieldIsUpgraded).toBe(false);
    expect(actor.points).toBe(0);
  });

  it('upgraded: grants 7 shield points and sets shieldIsUpgraded', () => {
    const state = createInitialState({ seats, seed: 'shield-up' });
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

    actor.points = 7;
    actor.hand = [{ instanceId: 'sh-1', cardId: 'shield', isUpgraded: true }];

    const result = performTurnAction(state, actorId, {
      type: 'playCard',
      instanceId: 'sh-1',
    });

    expect(result.ok).toBe(true);
    expect(actor.shield).toBe(7);
    expect(actor.shieldIsUpgraded).toBe(true);
  });

  it('rejects recreation while a shield is active', () => {
    const state = createInitialState({ seats, seed: 'shield-reject' });
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

    actor.points = 14;
    actor.shield = 4;
    actor.shieldIsUpgraded = false;
    actor.hand = [{ instanceId: 'sh-1', cardId: 'shield', isUpgraded: false }];

    const result = performTurnAction(state, actorId, {
      type: 'playCard',
      instanceId: 'sh-1',
    });

    expect(result.ok).toBe(false);
    expect(actor.shield).toBe(4);
    expect(actor.points).toBe(14);
  });

  it('clears shieldIsUpgraded when damage reduces shield to 0', () => {
    const state = createInitialState({ seats, seed: 'shield-clear' });
    const actor = state.players[0];

    expect(actor).toBeDefined();

    if (actor === undefined) {
      return;
    }

    actor.shield = 3;
    actor.shieldIsUpgraded = true;
    actor.lives = 10;

    applyDamage(actor, 3, 'basic-attack');

    expect(actor.shield).toBe(0);
    expect(actor.shieldIsUpgraded).toBe(false);
    expect(actor.lives).toBe(10);
  });
});
