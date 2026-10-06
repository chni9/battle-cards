/**
 * Spy and visibility matrix — rules spec §3, Lot 69 inverted reveal.
 */

import { describe, expect, it } from 'vitest';

import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Spy (Lot 69)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
    { id: 'c', nickname: 'Carol' },
  ] as const;

  it('base Spy shows live resources only, not kit or cards', () => {
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

    spy.points = 2;
    spy.hand = [{ instanceId: 'spy-1', cardId: 'spy', isUpgraded: false }];
    target.points = 9;
    target.lives = 11;
    target.upgradePoints = 3;
    target.shield = 2;
    target.kitId = 'kamikaze';

    performTurnAction(state, spyId, {
      type: 'playCard',
      instanceId: 'spy-1',
      targetPlayerId: target.id,
    });

    state.currentTurnPlayerId = target.id;
    performTurnAction(state, target.id, { type: 'draw' });
    target.lives = 20;
    target.points = 1;

    const viewForSpy = buildPlayingViewFor({
      recipientSessionId: spyId,
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    const spiedBySpy = viewForSpy.players.find((player) => player.id === target.id)?.spied;

    expect(spiedBySpy?.kitId).toBeUndefined();
    expect(spiedBySpy?.hand).toBeUndefined();
    expect(spiedBySpy?.lives).toBe(20);
    expect(spiedBySpy?.points).toBe(1);
    expect(spiedBySpy?.resourcesSnapshot).toBeUndefined();
  });

  it('Spy+ shows live resources plus kit and cards', () => {
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

    if (spy === undefined || target === undefined) {
      throw new Error('missing seats');
    }

    spy.points = 2;
    spy.hand = [{ instanceId: 'spy-1', cardId: 'spy', isUpgraded: true }];
    target.kitId = 'kamikaze';

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

    expect(spied?.kitId).toBe('kamikaze');
    expect(spied?.hand?.length).toBe(target.hand.length);
    expect(spied?.lives).toBe(target.lives);
    expect(spied?.resourcesSnapshot).toBeUndefined();
  });
});
