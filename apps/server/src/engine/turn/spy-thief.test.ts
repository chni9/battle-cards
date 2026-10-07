/**
 * Spy Thief — rules spec §5, Lot 71.
 * Base chooses one living opponent. Upgraded hits every living opponent.
 * Both steal all points with no cap and no doubling, and leave Spy+.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { makeCounterEffect } from '../../testing/factories';
import { performTurnAction } from './perform-action';

describe('Spy Thief (rules spec §5, Lot 71)', () => {
  it('base steals one chosen opponent and leaves a Spy+ reveal', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'l71-spy-base',
      kitAssignment: ['untouchable', 'untouchable', 'untouchable'],
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(c).toBeDefined();
    if (a === undefined || b === undefined || c === undefined) {
      return;
    }

    a.specialCards = [{ instanceId: 'st-1', cardId: 'spy-thief', isUpgraded: false }];
    a.points = 5;
    a.pendingEffects = [];
    b.points = 25;
    b.pendingEffects = [];
    b.shield = 4;
    b.shieldIsUpgraded = true;
    c.points = 8;
    c.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(performTurnAction(state, a.id, { type: 'playCard', instanceId: 'st-1' }).ok).toBe(
      false,
    );
    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'st-1',
        targetPlayerId: b.id,
      }).ok,
    ).toBe(true);
    expect(b.pendingEffects.some((effect) => effect.cardId === 'spy-thief')).toBe(true);
    expect(c.pendingEffects.some((effect) => effect.cardId === 'spy-thief')).toBe(false);

    state.currentTurnPlayerId = b.id;
    const bPointsBefore = b.points;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(b.points).toBe(0);
    expect(b.shield).toBe(4);
    expect(a.points).toBe(bPointsBefore + 1);
    expect(
      state.visibility.find((row) => row.viewerId === a.id && row.subjectId === b.id)?.level,
    ).toBe('full-resources');
    expect(state.visibility.some((row) => row.viewerId === a.id && row.subjectId === c.id)).toBe(
      false,
    );

    const view = buildPlayingViewFor({
      recipientSessionId: a.id,
      gameCode: 'l71',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const bob = view.players.find((player) => player.id === b.id);
    expect(bob?.spied?.kitId).toBe(b.kitId);
    expect(bob?.spied?.hand).toEqual(b.hand);
    expect(bob?.spied?.points).toBe(0);
    expect(bob?.spied?.lives).toBe(b.lives);
  });

  it('rejects a living invisible target and still hits a visible one', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'l71-spy-invis',
      kitAssignment: ['untouchable', 'untouchable', 'untouchable'],
    });
    const a = state.players.find((player) => player.id === 'a');
    const c = state.players.find((player) => player.id === 'c');

    expect(a).toBeDefined();
    expect(c).toBeDefined();
    if (a === undefined || c === undefined) {
      return;
    }

    c.activePersistentEffects = [
      makeCounterEffect({ id: 'inv', cardId: 'invisibility', counter: 4 }),
    ];
    a.specialCards = [{ instanceId: 'st-1', cardId: 'spy-thief', isUpgraded: false }];
    a.points = 5;
    state.currentTurnPlayerId = a.id;

    const hidden = performTurnAction(state, a.id, {
      type: 'playCard',
      instanceId: 'st-1',
      targetPlayerId: c.id,
    });
    expect(hidden.ok).toBe(false);
    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'st-1',
        targetPlayerId: 'b',
      }).ok,
    ).toBe(true);
    expect(c.pendingEffects.some((effect) => effect.cardId === 'spy-thief')).toBe(false);
  });

  it('upgraded steals every living opponent without doubling and skips invisible seats', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'l71-spy-up',
      kitAssignment: ['untouchable', 'untouchable', 'untouchable'],
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(c).toBeDefined();
    if (a === undefined || b === undefined || c === undefined) {
      return;
    }

    c.activePersistentEffects = [
      makeCounterEffect({ id: 'inv', cardId: 'invisibility', counter: 4 }),
    ];
    a.specialCards = [{ instanceId: 'st-1', cardId: 'spy-thief', isUpgraded: true }];
    a.points = 5;
    a.pendingEffects = [];
    b.points = 10;
    b.pendingEffects = [];
    c.points = 40;
    c.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'st-1',
        targetPlayerId: b.id,
      }).ok,
    ).toBe(false);
    expect(performTurnAction(state, a.id, { type: 'playCard', instanceId: 'st-1' }).ok).toBe(
      true,
    );
    expect(b.pendingEffects.filter((effect) => effect.cardId === 'spy-thief')).toHaveLength(1);
    expect(c.pendingEffects.some((effect) => effect.cardId === 'spy-thief')).toBe(false);

    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(b.points).toBe(0);
    expect(a.points).toBe(11);
    expect(
      state.visibility.find((row) => row.viewerId === a.id && row.subjectId === b.id)?.level,
    ).toBe('full-resources');
    expect(c.points).toBe(40);
  });

  it('is not counterable and Untouchable is not immune', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l71-spy-counter',
      kitAssignment: ['untouchable', 'untouchable'],
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    expect(a).toBeDefined();
    expect(b).toBeDefined();
    if (a === undefined || b === undefined) {
      return;
    }

    a.specialCards = [{ instanceId: 'st-a', cardId: 'spy-thief', isUpgraded: false }];
    b.specialCards = [{ instanceId: 'st-b', cardId: 'spy-thief', isUpgraded: false }];
    a.points = 10;
    b.points = 10;
    a.pendingEffects = [];
    b.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'st-a',
        targetPlayerId: b.id,
      }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = b.id;
    expect(
      performTurnAction(state, b.id, {
        type: 'playCard',
        instanceId: 'st-b',
        targetPlayerId: a.id,
      }).ok,
    ).toBe(true);
    expect(b.points).toBe(0);
    expect(a.points).toBe(10);
    expect(a.pendingEffects.some((effect) => effect.cardId === 'spy-thief')).toBe(true);
  });
});
