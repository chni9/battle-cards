/**
 * Unspy — rules spec §3, L58-07.
 */

import { CLEAR_SPY_COST } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { grantSpy } from '../../protocol/visibility-matrix';
import { createInitialState } from '../create-initial-state';
import { enumerationStateFromView } from '../turn/enumeration-state-from-view';
import { listLegalActions } from '../turn/list-legal-actions';
import { listLegalEconomyActions } from '../turn/list-legal-economy';
import { performTurnAction } from '../turn/perform-action';

const seats = [
  { id: 'a', nickname: 'Alice' },
  { id: 'b', nickname: 'Bob' },
  { id: 'c', nickname: 'Carol' },
] as const;

function assertViewParity(
  state: ReturnType<typeof createInitialState>,
  playerId: string,
): void {
  const fromState = listLegalActions(state, playerId);
  const view = buildPlayingViewFor({
    recipientSessionId: playerId,
    gameCode: 'TEST',
    state,
    turnDeadlineMs: null,
    actionLog: [],
  });
  const fromView = listLegalActions(enumerationStateFromView(view, state.seed), playerId);
  expect(
    fromView.map((action) => JSON.stringify(action)).sort(),
  ).toEqual(fromState.map((action) => JSON.stringify(action)).sort());
}

describe('clearSpy (L58-07)', () => {
  it('pays 10 points and drops one living viewer row', () => {
    const state = createInitialState({ seats, seed: 'l58-07-drop' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      throw new Error('missing players');
    }

    grantSpy(state, 'b', 'a', 'kit-and-cards');
    grantSpy(state, 'c', 'a', 'full-resources');
    a.points = 15;
    a.pendingEffects = [];
    b.pendingEffects = [];
    c.pendingEffects = [];
    state.currentTurnPlayerId = a.id;

    const result = performTurnAction(state, a.id, {
      type: 'clearSpy',
      targetPlayerId: b.id,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.actionPlayed.action).toBe('clearSpy');
    expect(result.actionPlayed.targetPlayerId).toBe(b.id);
    expect(a.points).toBe(15 - CLEAR_SPY_COST);
    expect(
      state.visibility.some((relation) => relation.viewerId === 'b' && relation.subjectId === 'a'),
    ).toBe(false);
    expect(
      state.visibility.some((relation) => relation.viewerId === 'c' && relation.subjectId === 'a'),
    ).toBe(true);
  });

  it('rejects a dead spy without charging', () => {
    const state = createInitialState({ seats, seed: 'l58-07-dead' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    grantSpy(state, 'b', 'a', 'kit-and-cards');
    b.isEliminated = true;
    b.lives = 0;
    b.pendingReanimation = null;
    a.points = 12;
    state.currentTurnPlayerId = a.id;

    const result = performTurnAction(state, a.id, {
      type: 'clearSpy',
      targetPlayerId: b.id,
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.code).toBe('not-spying-you');
    expect(a.points).toBe(12);
    expect(
      state.visibility.some((relation) => relation.viewerId === 'b' && relation.subjectId === 'a'),
    ).toBe(true);
  });

  it('rejects overlay spectator vision as not-spying-you', () => {
    const state = createInitialState({ seats, seed: 'l58-07-overlay' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    b.isEliminated = true;
    b.lives = 0;
    b.pendingReanimation = null;
    a.points = 12;
    state.currentTurnPlayerId = a.id;
    expect(state.visibility).toEqual([]);

    const result = performTurnAction(state, a.id, {
      type: 'clearSpy',
      targetPlayerId: b.id,
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.code).toBe('not-spying-you');
    expect(a.points).toBe(12);
  });

  it('rejects when the actor cannot afford Unspy', () => {
    const state = createInitialState({ seats, seed: 'l58-07-poor' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    grantSpy(state, 'b', 'a', 'kit-and-cards');
    a.points = CLEAR_SPY_COST - 1;
    state.currentTurnPlayerId = a.id;
    const result = performTurnAction(state, a.id, {
      type: 'clearSpy',
      targetPlayerId: b.id,
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.code).toBe('not-enough-points');
    expect(
      state.visibility.some((relation) => relation.viewerId === 'b' && relation.subjectId === 'a'),
    ).toBe(true);
  });

  it('enumerates clearSpy only for living spies when affordable', () => {
    const state = createInitialState({ seats, seed: 'l58-07-legal' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      throw new Error('missing players');
    }

    a.hand = [];
    a.specialCards = [];
    a.upgradePoints = 0;
    a.points = CLEAR_SPY_COST;
    grantSpy(state, 'b', 'a', 'kit-and-cards');
    grantSpy(state, 'c', 'a', 'kit-and-cards');
    c.isEliminated = true;

    const legal = listLegalEconomyActions(state, a).filter(
      (action) => action.type === 'clearSpy',
    );
    expect(legal).toEqual([{ type: 'clearSpy', targetPlayerId: 'b' }]);

    a.points = CLEAR_SPY_COST - 1;
    expect(
      listLegalEconomyActions(state, a).some((action) => action.type === 'clearSpy'),
    ).toBe(false);
  });

  it('matches §10.1 view enumeration when Unspy is legal', () => {
    const state = createInitialState({ seats, seed: 'l58-07-parity' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    grantSpy(state, 'b', 'a', 'kit-and-cards');
    a.points = CLEAR_SPY_COST;
    state.currentTurnPlayerId = a.id;
    assertViewParity(state, a.id);
    expect(
      listLegalActions(state, a.id).some(
        (action) => action.type === 'clearSpy' && action.targetPlayerId === b.id,
      ),
    ).toBe(true);
  });
});
