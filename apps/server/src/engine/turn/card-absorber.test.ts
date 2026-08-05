/**
 * Card Absorber — rules spec §5, backlog L24-01 / #V4-14 / #V4-15.
 */

import { describe, expect, it } from 'vitest';

import { findHandler } from '../../cards/registry';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import { enumerationStateFromView } from './enumeration-state-from-view';
import { listLegalActions } from './list-legal-actions';
import {
  completePoolPick,
  performTurnAction,
} from './perform-action';

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

describe('Card Absorber (L24-01)', () => {
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

  it('rejects play when the pool is empty (#V4-15)', () => {
    const state = createInitialState({ seats, seed: 'l24-01-empty' });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing actor');
    }

    a.specialCards = [{ instanceId: 'ca-1', cardId: 'card-absorber', isUpgraded: false }];
    a.points = 10;
    state.pool = [];
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'ca-1' }).ok,
    ).toBe(false);
    expect(a.specialCards).toHaveLength(1);
  });

  it.each([1, 3, 10] as const)(
    'base recovers min(4, pool.length)=%s cards',
    (poolSize) => {
      const state = createInitialState({ seats, seed: `l24-01-base-${String(poolSize)}` });
      const a = state.players.find((player) => player.id === 'a');

      if (a === undefined) {
        throw new Error('missing actor');
      }

      a.specialCards = [{ instanceId: 'ca-1', cardId: 'card-absorber', isUpgraded: false }];
      a.points = 10;
      a.hand = [];
      seedPool(state, poolSize);
      state.currentTurnPlayerId = a.id;

      const beforeIds = new Set(state.pool.map((card) => card.instanceId));
      expect(performTurnAction(state, a.id, { type: 'playCard', instanceId: 'ca-1' }).ok).toBe(
        true,
      );

      const expected = Math.min(4, poolSize);
      // Absorber itself joins the pool after play (instant special).
      expect(state.pool).toHaveLength(poolSize - expected + 1);
      expect(state.pool.some((card) => card.instanceId === 'ca-1')).toBe(true);
      expect(a.hand.length + a.specialCards.length).toBe(expected);
      expect(state.subChoice).toBeNull();

      for (const card of [...a.hand, ...a.specialCards]) {
        expect(beforeIds.has(card.instanceId)).toBe(true);
      }
    },
  );

  it('preserves isUpgraded from the pool (#V4-14)', () => {
    const state = createInitialState({ seats, seed: 'l24-01-upgrade' });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing actor');
    }

    a.specialCards = [{ instanceId: 'ca-1', cardId: 'card-absorber', isUpgraded: false }];
    a.points = 10;
    a.hand = [];
    state.pool = [
      { instanceId: 'up-imp', cardId: 'imposition', isUpgraded: true },
      { instanceId: 'plain', cardId: 'tax', isUpgraded: false },
    ];
    state.currentTurnPlayerId = a.id;

    const rng = createRng('l24-01-upgrade-forced');
    // Force both picks by using a deterministic shuffle seed path via performTurnAction's turn rng.
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'ca-1' }, rng).ok,
    ).toBe(true);

    const recovered = [...a.hand, ...a.specialCards];
    expect(recovered).toHaveLength(2);
    const upgraded = recovered.find((card) => card.instanceId === 'up-imp');
    expect(upgraded?.isUpgraded).toBe(true);
  });

  it('upgraded raises pool-pick; complete recovers chosen cards (up to 8)', () => {
    const state = createInitialState({ seats, seed: 'l24-01-upgraded' });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing actor');
    }

    a.specialCards = [{ instanceId: 'ca-1', cardId: 'card-absorber', isUpgraded: true }];
    a.points = 10;
    a.hand = [];
    seedPool(state, 10);
    state.currentTurnPlayerId = a.id;

    const play = performTurnAction(state, a.id, { type: 'playCard', instanceId: 'ca-1' });
    expect(play.ok).toBe(true);

    if (!play.ok) {
      return;
    }

    expect(play.subChoicePending).toBe(true);
    expect(state.subChoice?.kind).toBe('pool-pick');
    expect(state.subChoice?.kind === 'pool-pick' ? state.subChoice.maxCount : 0).toBe(8);
    // Absorber joined the pool after play; pick eligibility was snapshotted before that.
    expect(state.pool).toHaveLength(11);
    expect(state.pool.some((card) => card.instanceId === 'ca-1')).toBe(true);

    const pickIds =
      state.subChoice?.kind === 'pool-pick'
        ? state.subChoice.eligibleInstanceIds.slice(0, 8)
        : [];
    expect(
      completePoolPick(state, a.id, pickIds).ok,
    ).toBe(true);
    expect(state.pool).toHaveLength(3);
    expect(a.hand.length + a.specialCards.length).toBe(8);
    expect(state.subChoice).toBeNull();
  });

  it('upgraded pool-pick caps at pool size when fewer than 8', () => {
    const state = createInitialState({ seats, seed: 'l24-01-upgraded-small' });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing actor');
    }

    a.specialCards = [{ instanceId: 'ca-1', cardId: 'card-absorber', isUpgraded: true }];
    a.points = 10;
    a.hand = [];
    seedPool(state, 5);
    state.currentTurnPlayerId = a.id;

    expect(performTurnAction(state, a.id, { type: 'playCard', instanceId: 'ca-1' }).ok).toBe(
      true,
    );
    expect(state.subChoice?.kind === 'pool-pick' ? state.subChoice.maxCount : 0).toBe(5);
  });

  it('§10.1 parity: canPlay reads pool via view (real absorber)', () => {
    const state = createInitialState({ seats, seed: 'l24-01-parity' });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing actor');
    }

    a.specialCards = [{ instanceId: 'ca-1', cardId: 'card-absorber', isUpgraded: false }];
    a.points = 10;
    seedPool(state, 3);
    state.currentTurnPlayerId = a.id;

    expect(findHandler('card-absorber')).toBeDefined();
    assertViewParity(state, a.id);

    const legal = listLegalActions(state, a.id);
    expect(
      legal.some(
        (action) => action.type === 'playCard' && action.instanceId === 'ca-1',
      ),
    ).toBe(true);

    state.pool = [];
    assertViewParity(state, a.id);
    expect(
      listLegalActions(state, a.id).some(
        (action) => action.type === 'playCard' && action.instanceId === 'ca-1',
      ),
    ).toBe(false);
  });
});
