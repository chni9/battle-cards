/**
 * Absorber — rules spec §3, backlog L3-08.
 */

import { CLASSIC_LIFE_LIMIT } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Absorber (rules spec §3, L3-08)', () => {
  it('gains lives lost after a turn with attack damage and Tax', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'absorber-base',
    });

    state.currentTurnPlayerId = 'a';
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();

    if (alice === undefined || bob === undefined) {
      return;
    }

    alice.points = 1;
    alice.hand = [{ instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false }];
    bob.lives = 20;

    performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'atk-1',
      targetPlayerId: 'b',
    });

    state.currentTurnPlayerId = 'b';
    bob.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    performTurnAction(state, 'b', {
      type: 'playCard',
      instanceId: 'tax-1',
    });

    // Bob's ledger: 1 from Tax + 1 from basic attack = 2 livesLost.
    expect(bob.turnLedger.livesLost).toBe(2);

    state.currentTurnPlayerId = 'a';
    alice.points = 3;
    alice.lives = 10;
    alice.hand = [{ instanceId: 'abs-1', cardId: 'absorber', isUpgraded: false }];

    const absorb = performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'abs-1',
      targetPlayerId: 'b',
    });

    expect(absorb.ok).toBe(true);
    expect(alice.lives).toBe(12);
  });

  it('upgraded captures spend but not theft', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'absorber-up',
    });
    state.currentTurnPlayerId = 'a';
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();

    if (alice === undefined || bob === undefined) {
      return;
    }

    bob.turnLedger = {
      livesLost: 2,
      pointsSpent: 7,
      upgradePointsSpent: 1,
      pointsLostToTheft: 10,
      upgradePointsLostToTheft: 4,
    };

    alice.points = 3;
    alice.lives = 10;
    alice.upgradePoints = 0;
    alice.hand = [{ instanceId: 'abs-1', cardId: 'absorber', isUpgraded: true }];

    const absorb = performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'abs-1',
      targetPlayerId: 'b',
    });

    expect(absorb.ok).toBe(true);
    expect(alice.lives).toBe(12);
    expect(alice.points).toBe(7);
    expect(alice.upgradePoints).toBe(1);
  });

  it('rejects absorbing oneself', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'absorber-self',
    });
    state.currentTurnPlayerId = 'a';
    const alice = state.players.find((player) => player.id === 'a');

    expect(alice).toBeDefined();

    if (alice === undefined) {
      return;
    }

    alice.points = 3;
    alice.hand = [{ instanceId: 'abs-1', cardId: 'absorber', isUpgraded: false }];

    const result = performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'abs-1',
      targetPlayerId: 'a',
    });

    expect(result.ok).toBe(false);
  });

  it('respects the lifeLimit cap', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'absorber-cap',
    });
    state.currentTurnPlayerId = 'a';
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();

    if (alice === undefined || bob === undefined) {
      return;
    }

    bob.turnLedger.livesLost = 10;
    alice.lives = CLASSIC_LIFE_LIMIT - 2;
    alice.points = 3;
    alice.hand = [{ instanceId: 'abs-1', cardId: 'absorber', isUpgraded: false }];

    performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'abs-1',
      targetPlayerId: 'b',
    });

    expect(alice.lives).toBe(CLASSIC_LIFE_LIMIT);
  });

  it('can absorb an eliminated player while their absorb window is open', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'absorber-corpse',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');

    if (alice === undefined || bob === undefined || carol === undefined) {
      return;
    }

    bob.isEliminated = true;
    bob.turnLedger.livesLost = 3;
    bob.absorbWindowPendingPlayerIds = ['a', 'c'];
    alice.lives = 10;
    alice.points = 3;
    alice.hand = [{ instanceId: 'abs-1', cardId: 'absorber', isUpgraded: false }];
    state.currentTurnPlayerId = 'a';

    expect(
      performTurnAction(state, 'a', {
        type: 'playCard',
        instanceId: 'abs-1',
        targetPlayerId: 'b',
      }).ok,
    ).toBe(true);
    expect(alice.lives).toBe(13);
  });

  it('rejects Absorber on a corpse after the absorb window closes', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'absorber-corpse-closed',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      return;
    }

    bob.isEliminated = true;
    bob.turnLedger.livesLost = 5;
    bob.absorbWindowPendingPlayerIds = null;
    alice.points = 3;
    alice.hand = [{ instanceId: 'abs-1', cardId: 'absorber', isUpgraded: false }];
    state.currentTurnPlayerId = 'a';

    expect(
      performTurnAction(state, 'a', {
        type: 'playCard',
        instanceId: 'abs-1',
        targetPlayerId: 'b',
      }).ok,
    ).toBe(false);
  });
});
