/**
 * Spy and visibility matrix — rules spec §3, technical spec §5.1, backlog L3-05.
 */

import { describe, expect, it } from 'vitest';

import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Spy (rules spec §3, L3-05)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
    { id: 'c', nickname: 'Carol' },
  ] as const;

  it('base: spy sees kit and cards; a third player does not', () => {
    const state = createInitialState({ seats, seed: 'spy-base' });
    const spyId = state.currentTurnPlayerId;

    expect(spyId).not.toBeNull();

    if (spyId === null) {
      return;
    }

    const spy = state.players.find((player) => player.id === spyId);
    const target = state.players.find((player) => player.id !== spyId);

    expect(spy).toBeDefined();
    expect(target).toBeDefined();

    if (spy === undefined || target === undefined) {
      return;
    }

    const outsider = state.players.find(
      (player) => player.id !== spyId && player.id !== target.id,
    );

    expect(outsider).toBeDefined();

    if (outsider === undefined) {
      return;
    }

    spy.points = 4;
    spy.hand = [{ instanceId: 'spy-1', cardId: 'spy', isUpgraded: false }];
    target.points = 9;
    target.kitId = 'kamikaze';

    performTurnAction(state, spyId, {
      type: 'playCard',
      instanceId: 'spy-1',
      targetPlayerId: target.id,
    });

    state.currentTurnPlayerId = target.id;
    performTurnAction(state, target.id, { type: 'draw' });

    const viewForSpy = buildPlayingViewFor({
      recipientSessionId: spyId,
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const viewForOutsider = buildPlayingViewFor({
      recipientSessionId: outsider.id,
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    const spiedBySpy = viewForSpy.players.find((player) => player.id === target.id)?.spied;
    const spiedByOutsider = viewForOutsider.players.find(
      (player) => player.id === target.id,
    )?.spied;

    expect(spiedBySpy?.kitId).toBe('kamikaze');
    expect(spiedBySpy?.hand.length).toBe(target.hand.length);
    expect(spiedBySpy?.points).toBeUndefined();
    const relation = state.visibility.find(
      (entry) => entry.viewerId === spyId && entry.subjectId === target.id,
    );
    expect(spiedBySpy?.pointsSnapshot).toEqual(relation?.pointsSnapshot);
    expect(spiedBySpy?.pointsSnapshot?.points).toBe(target.points);
    expect(viewForSpy.players.find((player) => player.id === target.id)).not.toHaveProperty(
      'lives',
    );
    expect(spiedByOutsider).toBeUndefined();
  });

  it('upgraded: reveals live points (tokens) and card lists, not lives/shield/UP', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'spy-up',
    });
    const spyId = state.currentTurnPlayerId;

    expect(spyId).not.toBeNull();

    if (spyId === null) {
      return;
    }

    const spy = state.players.find((player) => player.id === spyId);
    const target = state.players.find((player) => player.id !== spyId);

    expect(spy).toBeDefined();
    expect(target).toBeDefined();

    if (spy === undefined || target === undefined) {
      return;
    }

    spy.points = 4;
    spy.hand = [{ instanceId: 'spy-1', cardId: 'spy', isUpgraded: true }];
    target.kitId = 'kamikaze';
    target.points = 12;
    target.upgradePoints = 2;
    target.lives = 17;
    target.shield = 4;

    performTurnAction(state, spyId, {
      type: 'playCard',
      instanceId: 'spy-1',
      targetPlayerId: target.id,
    });

    state.currentTurnPlayerId = target.id;
    performTurnAction(state, target.id, { type: 'draw' });

    const view = buildPlayingViewFor({
      recipientSessionId: spyId,
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    const spied = view.players.find((player) => player.id === target.id)?.spied;

    expect(spied?.points).toBe(target.points);
    expect(spied?.pointsSnapshot).toBeUndefined();
    expect(spied).not.toHaveProperty('lives');
    expect(spied).not.toHaveProperty('shield');
    expect(spied).not.toHaveProperty('upgradePoints');
    expect(spied?.hand.length).toBe(target.hand.length);
  });

  it('base points snapshot stays frozen when the target later gains points', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'spy-snap',
    });
    const spyId = state.currentTurnPlayerId;

    expect(spyId).not.toBeNull();
    if (spyId === null) {
      return;
    }

    const spy = state.players.find((player) => player.id === spyId);
    const target = state.players.find((player) => player.id !== spyId);
    expect(spy).toBeDefined();
    expect(target).toBeDefined();
    if (spy === undefined || target === undefined) {
      return;
    }

    spy.points = 4;
    spy.hand = [{ instanceId: 'spy-1', cardId: 'spy', isUpgraded: false }];
    target.kitId = 'assassin';
    target.points = 5;

    performTurnAction(state, spyId, {
      type: 'playCard',
      instanceId: 'spy-1',
      targetPlayerId: target.id,
    });

    state.currentTurnPlayerId = target.id;
    performTurnAction(state, target.id, { type: 'draw' });
    const relation = state.visibility.find(
      (entry) => entry.viewerId === spyId && entry.subjectId === target.id,
    );
    expect(relation?.pointsSnapshot).toBeDefined();
    const frozenPoints = relation?.pointsSnapshot?.points;
    const frozenSequence = relation?.pointsSnapshot?.turnSequence;

    target.points += 20;

    const view = buildPlayingViewFor({
      recipientSessionId: spyId,
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const spied = view.players.find((player) => player.id === target.id)?.spied;

    expect(spied?.pointsSnapshot).toEqual({
      points: frozenPoints,
      turnSequence: frozenSequence,
    });
    expect(spied?.points).toBeUndefined();
  });

  it('fizzles against an active upgraded shield', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'spy-shield',
    });
    const spyId = state.currentTurnPlayerId;

    expect(spyId).not.toBeNull();

    if (spyId === null) {
      return;
    }

    const spy = state.players.find((player) => player.id === spyId);
    const target = state.players.find((player) => player.id !== spyId);

    expect(spy).toBeDefined();
    expect(target).toBeDefined();

    if (spy === undefined || target === undefined) {
      return;
    }

    spy.points = 4;
    spy.hand = [{ instanceId: 'spy-1', cardId: 'spy', isUpgraded: false }];
    target.shield = 7;
    target.shieldIsUpgraded = true;

    performTurnAction(state, spyId, {
      type: 'playCard',
      instanceId: 'spy-1',
      targetPlayerId: target.id,
    });

    state.currentTurnPlayerId = target.id;
    performTurnAction(state, target.id, { type: 'draw' });

    expect(state.visibility).toHaveLength(0);
  });
});
