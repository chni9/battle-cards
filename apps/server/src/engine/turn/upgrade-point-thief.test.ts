/**
 * Upgrade Point Thief — rules spec §5, backlog L21-02 / #V4-17 / #V4-18 / #V4-33.
 */

import { describe, expect, it } from 'vitest';

import { acquireCardToHand } from '../kits/acquire-card';
import { createInitialState } from '../create-initial-state';
import { makeCounterEffect } from '../../testing/factories';
import { performTurnAction } from './perform-action';

describe('Upgrade Point Thief (L21-02)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('steals unspent UP and grants 1 UP per stripped upgrade including kit-trait (#V4-18)', () => {
    const state = createInitialState({ seats, seed: 'l21-02-upt-base' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.specialCards = [
      { instanceId: 'upt-1', cardId: 'upgrade-point-thief', isUpgraded: false },
    ];
    a.points = 5;
    a.upgradePoints = 0;
    a.pendingEffects = [];

    b.kitId = 'scientific';
    b.upgradePoints = 3;
    b.hand = [{ instanceId: 'spy-1', cardId: 'spy', isUpgraded: true }];
    b.specialCards = [];
    b.pendingEffects = [];
    b.shieldIsUpgraded = false;
    b.activePersistentEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'upt-1' }).ok,
    ).toBe(true);
    expect(b.pendingEffects).toHaveLength(1);
    expect(b.pendingEffects[0]?.cardId).toBe('upgrade-point-thief');

    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);

    // 3 stolen UP + 1 for stripped Spy trait upgrade
    expect(b.upgradePoints).toBe(0);
    expect(b.hand[0]?.isUpgraded).toBe(false);
    expect(a.upgradePoints).toBe(4);
    expect(b.turnLedger.upgradePointsLostToTheft).toBe(3);

    // Copy acquired afterwards arrives upgraded again (#V4-18 / alwaysUpgraded)
    const next = acquireCardToHand(b, 'spy', 'spy-after');
    expect(next.isUpgraded).toBe(true);
  });

  it('strips shieldIsUpgraded and active-persistent isUpgraded (#V4-17)', () => {
    const state = createInitialState({ seats, seed: 'l21-02-upt-v417' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.specialCards = [
      { instanceId: 'upt-1', cardId: 'upgrade-point-thief', isUpgraded: false },
    ];
    a.points = 5;
    a.upgradePoints = 0;
    a.pendingEffects = [];

    b.upgradePoints = 0;
    b.hand = [];
    b.specialCards = [];
    b.pendingEffects = [];
    b.shieldIsUpgraded = true;
    b.activePersistentEffects = [
      makeCounterEffect({
        id: 'imp-1',
        cardId: 'imposition',
        isUpgraded: true,
        counter: 2,
      }),
    ];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'upt-1' }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);

    expect(b.shieldIsUpgraded).toBe(false);
    expect(b.activePersistentEffects[0]?.isUpgraded).toBe(false);
    expect(a.upgradePoints).toBe(2);
  });

  it('upgraded also steals all points via theft ledger', () => {
    const state = createInitialState({ seats, seed: 'l21-02-upt-up' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.specialCards = [
      { instanceId: 'upt-1', cardId: 'upgrade-point-thief', isUpgraded: true },
    ];
    a.points = 5;
    a.upgradePoints = 0;
    a.pendingEffects = [];

    b.upgradePoints = 2;
    b.points = 17;
    b.hand = [];
    b.specialCards = [];
    b.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'upt-1' }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);

    expect(b.points).toBe(0);
    expect(b.upgradePoints).toBe(0);
    expect(a.upgradePoints).toBe(2);
    // a paid 5 to play (→0); gains b's 17 + 1 draw = 18 via theft
    expect(a.points).toBe(18);
    expect(b.turnLedger.pointsLostToTheft).toBe(18);
    expect(b.turnLedger.pointsSpent).toBe(0);
  });

  it('reciprocal Upgrade Point Thief does not cancel (#V4-33)', () => {
    const state = createInitialState({ seats, seed: 'l21-02-upt-counter' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.specialCards = [
      { instanceId: 'upt-a', cardId: 'upgrade-point-thief', isUpgraded: false },
    ];
    a.points = 5;
    a.upgradePoints = 1;
    a.pendingEffects = [];
    a.hand = [{ instanceId: 'a-tax', cardId: 'tax', isUpgraded: true }];

    b.specialCards = [
      { instanceId: 'upt-b', cardId: 'upgrade-point-thief', isUpgraded: false },
    ];
    b.points = 5;
    b.upgradePoints = 1;
    b.pendingEffects = [];
    b.hand = [{ instanceId: 'b-tax', cardId: 'tax', isUpgraded: true }];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'upt-a' }).ok,
    ).toBe(true);
    expect(b.pendingEffects).toHaveLength(1);

    state.currentTurnPlayerId = b.id;
    expect(
      performTurnAction(state, b.id, { type: 'playCard', instanceId: 'upt-b' }).ok,
    ).toBe(true);
    // a's UPT resolved on b's turn (applied, not cancelled); b's UPT stays pending on a
    expect(b.pendingEffects.filter((effect) => effect.cardId === 'upgrade-point-thief')).toEqual(
      [],
    );
    expect(a.pendingEffects.some((effect) => effect.cardId === 'upgrade-point-thief')).toBe(
      true,
    );
    expect(b.hand[0]?.isUpgraded).toBe(false);
    expect(b.upgradePoints).toBe(0);
    // a still holds their upgraded tax — b's reciprocal effect has not resolved yet
    expect(a.hand[0]?.isUpgraded).toBe(true);
  });
});
