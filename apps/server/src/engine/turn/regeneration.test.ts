/**
 * Regeneration — rules spec §3 · §7, backlog L3-02.
 */

import { CLASSIC_LIFE_LIMIT } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Regeneration (rules spec §3, L3-02)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('base: buys lives at 3 points each, up to 4', () => {
    const state = createInitialState({ seats, seed: 'regen-base' });
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
    actor.points = 12;
    actor.hand = [{ instanceId: 'regen-1', cardId: 'regeneration', isUpgraded: false }];

    const result = performTurnAction(state, actorId, {
      type: 'playCard',
      instanceId: 'regen-1',
      quantity: 4,
    });

    expect(result.ok).toBe(true);
    expect(actor.lives).toBe(14);
    expect(actor.points).toBe(0);
    expect(actor.turnLedger.pointsSpent).toBe(12);
  });

  it('upgraded: 2 points per life', () => {
    const state = createInitialState({ seats, seed: 'regen-up' });
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
    actor.points = 8;
    actor.hand = [{ instanceId: 'regen-1', cardId: 'regeneration', isUpgraded: true }];

    const result = performTurnAction(state, actorId, {
      type: 'playCard',
      instanceId: 'regen-1',
      quantity: 4,
    });

    expect(result.ok).toBe(true);
    expect(actor.lives).toBe(14);
    expect(actor.points).toBe(0);
    expect(actor.turnLedger.pointsSpent).toBe(8);
  });

  it('gain is capped at lifeLimit; excess lost but points still spent', () => {
    const state = createInitialState({ seats, seed: 'regen-cap' });
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

    expect(state.lifeLimit).toBe(CLASSIC_LIFE_LIMIT);
    actor.lives = 24;
    actor.points = 12;
    actor.hand = [{ instanceId: 'regen-1', cardId: 'regeneration', isUpgraded: false }];

    const result = performTurnAction(state, actorId, {
      type: 'playCard',
      instanceId: 'regen-1',
      quantity: 4,
    });

    expect(result.ok).toBe(true);
    expect(actor.lives).toBe(CLASSIC_LIFE_LIMIT);
    expect(actor.points).toBe(0);
  });

  it('rejects missing or out-of-range quantity', () => {
    const state = createInitialState({ seats, seed: 'regen-bad-qty' });
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

    actor.points = 12;
    actor.hand = [{ instanceId: 'regen-1', cardId: 'regeneration', isUpgraded: false }];

    expect(
      performTurnAction(state, actorId, { type: 'playCard', instanceId: 'regen-1' }).ok,
    ).toBe(false);
    expect(
      performTurnAction(state, actorId, {
        type: 'playCard',
        instanceId: 'regen-1',
        quantity: 0,
      }).ok,
    ).toBe(false);
    expect(
      performTurnAction(state, actorId, {
        type: 'playCard',
        instanceId: 'regen-1',
        quantity: 5,
      }).ok,
    ).toBe(false);
    expect(actor.points).toBe(12);
  });
});
