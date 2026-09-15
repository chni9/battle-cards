/**
 * Random pool buy — rules spec §1, L58-05.
 */

import { describe, expect, it } from 'vitest';

import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import { enumerationStateFromView } from '../turn/enumeration-state-from-view';
import { listLegalActions } from '../turn/list-legal-actions';
import { listLegalEconomyActions } from '../turn/list-legal-economy';
import { performTurnAction } from '../turn/perform-action';
import { buyPoolCard } from './buy-pool-card';

const seats = [
  { id: 'a', nickname: 'Alice' },
  { id: 'b', nickname: 'Bob' },
] as const;

function seedPool(
  state: ReturnType<typeof createInitialState>,
  count: number,
): void {
  state.pool = Array.from({ length: count }, (_, index) => ({
    instanceId: `pool-${String(index)}`,
    cardId: index % 2 === 0 ? ('basic-attack' as const) : ('tax' as const),
    isUpgraded: index === 0,
  }));
}

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

describe('buyPoolCard (L58-05)', () => {
  it('doubles the table-wide fee 1 → 2 → 4 and never resets when empty', () => {
    const state = createInitialState({ seats, seed: 'l58-05-double' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    seedPool(state, 3);
    a.points = 7;
    a.pendingEffects = [];
    b.pendingEffects = [];
    expect(state.poolBuyCost).toBe(1);

    for (const fee of [1, 2, 4]) {
      state.currentTurnPlayerId = a.id;
      expect(state.poolBuyCost).toBe(fee);
      const result = performTurnAction(state, a.id, { type: 'buyPoolCard' });
      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }

      expect(result.actionPlayed.action).toBe('buyPoolCard');
      expect(result.actionPlayed.cardId).toBeDefined();
    }

    expect(state.poolBuyCost).toBe(8);
    expect(state.pool).toHaveLength(0);

    state.currentTurnPlayerId = a.id;
    a.points = 20;
    const empty = performTurnAction(state, a.id, { type: 'buyPoolCard' });
    expect(empty.ok).toBe(false);
    if (empty.ok) {
      return;
    }

    expect(empty.code).toBe('empty-pool');
    expect(state.poolBuyCost).toBe(8);
  });

  it('rejects an empty pool without charging and without moving the fee', () => {
    const state = createInitialState({ seats, seed: 'l58-05-empty' });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing actor');
    }

    state.pool = [];
    a.points = 10;
    state.currentTurnPlayerId = a.id;
    const result = performTurnAction(state, a.id, { type: 'buyPoolCard' });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.code).toBe('empty-pool');
    expect(a.points).toBe(10);
    expect(state.poolBuyCost).toBe(1);
  });

  it('rejects when the actor cannot afford the public fee', () => {
    const state = createInitialState({ seats, seed: 'l58-05-poor' });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing actor');
    }

    seedPool(state, 2);
    state.poolBuyCost = 4;
    a.points = 3;
    state.currentTurnPlayerId = a.id;
    const result = performTurnAction(state, a.id, { type: 'buyPoolCard' });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.code).toBe('not-enough-points');
    expect(state.pool).toHaveLength(2);
    expect(state.poolBuyCost).toBe(4);
  });

  it('does not move the fee when Card Absorber recovers from the pool', () => {
    const state = createInitialState({ seats, seed: 'l58-05-absorber' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    seedPool(state, 5);
    state.poolBuyCost = 4;
    a.specialCards = [{ instanceId: 'ca-1', cardId: 'card-absorber', isUpgraded: false }];
    a.points = 10;
    a.pendingEffects = [];
    b.pendingEffects = [];
    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'ca-1' }).ok,
    ).toBe(true);
    expect(state.poolBuyCost).toBe(4);
    expect(state.pool.length).toBeLessThan(5);
  });

  it('picks the same instance for the same injected seed', () => {
    const run = (): string => {
      const state = createInitialState({ seats, seed: 'l58-05-rng-shell' });
      const a = state.players.find((player) => player.id === 'a');

      if (a === undefined) {
        throw new Error('missing actor');
      }

      seedPool(state, 5);
      a.points = 1;
      const result = buyPoolCard(state, a.id, createRng('l58-05-pick'));
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error('buy failed');
      }

      return result.instance.instanceId;
    };

    expect(run()).toBe(run());
  });

  it('enumerates buyPoolCard only when the pool is non-empty and affordable', () => {
    const state = createInitialState({ seats, seed: 'l58-05-legal' });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing actor');
    }

    a.hand = [];
    a.specialCards = [];
    a.upgradePoints = 0;
    a.points = 1;
    state.pool = [];
    expect(listLegalEconomyActions(state, a).some((action) => action.type === 'buyPoolCard')).toBe(
      false,
    );

    seedPool(state, 1);
    expect(listLegalEconomyActions(state, a).some((action) => action.type === 'buyPoolCard')).toBe(
      true,
    );

    a.points = 0;
    expect(listLegalEconomyActions(state, a).some((action) => action.type === 'buyPoolCard')).toBe(
      false,
    );
  });

  it('matches §10.1 view enumeration when a pool buy is legal', () => {
    const state = createInitialState({ seats, seed: 'l58-05-parity' });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing actor');
    }

    seedPool(state, 2);
    a.points = 1;
    state.currentTurnPlayerId = a.id;
    assertViewParity(state, a.id);
    expect(listLegalActions(state, a.id).some((action) => action.type === 'buyPoolCard')).toBe(
      true,
    );
  });
});
