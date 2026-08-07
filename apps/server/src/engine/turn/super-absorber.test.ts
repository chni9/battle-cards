/**
 * Super Absorber — rules spec §5, backlog L22-03, #V4-21.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { applyPersistentEffects } from './apply-persistent-effects';
import { performTurnAction } from './perform-action';

describe('Super Absorber (L22-03)', () => {
  it('base absorbs points, UP and livesLost from the current seat; upgraded doubles', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-03-base',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'sa', cardId: 'super-absorber', counter: 2 }),
    ];
    a.points = 0;
    a.upgradePoints = 0;
    a.lives = 10;
    b.turnLedger.pointsSpent = 4;
    b.turnLedger.upgradePointsSpent = 1;
    b.turnLedger.livesLost = 2;

    applyPersistentEffects(state, b.id);
    expect(a.points).toBe(4);
    expect(a.upgradePoints).toBe(1);
    expect(a.lives).toBe(12);

    a.points = 0;
    a.upgradePoints = 0;
    a.lives = 10;
    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'sa-u',
        cardId: 'super-absorber',
        isUpgraded: true,
        counter: 2,
      }),
    ];
    applyPersistentEffects(state, b.id);
    expect(a.points).toBe(8);
    expect(a.upgradePoints).toBe(2);
    expect(a.lives).toBe(14);
  });

  it('does not absorb stolen points', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-03-theft',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'sa', cardId: 'super-absorber', counter: 2 }),
    ];
    a.points = 0;
    b.turnLedger.pointsSpent = 0;
    b.turnLedger.pointsLostToTheft = 5;

    applyPersistentEffects(state, b.id);
    expect(a.points).toBe(0);
  });

  it('life gains clamp at GameState.lifeLimit', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-03-cap',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'sa', cardId: 'super-absorber', counter: 2 }),
    ];
    a.lives = 24;
    b.turnLedger.livesLost = 5;

    applyPersistentEffects(state, b.id);
    expect(a.lives).toBe(state.lifeLimit);
  });

  it('does not absorb lives lost later in the same phase by Poison', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'l22-03-order',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      return;
    }

    // a holds SA; c holds Poison against b. SA ticks before Poison.
    a.activePersistentEffects = [
      makeCounterEffect({ id: 'sa', cardId: 'super-absorber', counter: 2 }),
    ];
    c.activePersistentEffects = [
      makeCounterEffect({ id: 'poi', cardId: 'poison', counter: 3 }),
    ];
    a.lives = 10;
    a.points = 0;
    b.lives = 10;
    b.turnLedger.pointsSpent = 3;
    b.turnLedger.livesLost = 0;

    applyPersistentEffects(state, b.id);
    expect(a.points).toBe(3);
    expect(a.lives).toBe(10); // no livesLost at SA time
    expect(b.lives).toBe(9); // Poison after SA
    expect(b.turnLedger.livesLost).toBe(1); // Poison wrote after SA read
  });

  it('counter depletes on owner damage and pools', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-03-counter',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'sa', cardId: 'super-absorber', counter: 1 }),
    ];
    a.lives = 10;
    a.shield = 0;

    b.hand = [{ instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false }];
    b.points = 1;
    state.currentTurnPlayerId = b.id;
    expect(
      performTurnAction(state, b.id, {
        type: 'playCard',
        instanceId: 'atk-1',
        targetPlayerId: a.id,
      }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = a.id;
    a.points = 1;
    expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);
    expect(a.activePersistentEffects).toHaveLength(0);
    expect(state.pool.some((card) => card.cardId === 'super-absorber')).toBe(true);
  });

  it('activates via playCard without pooling the copy', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-03-play',
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      return;
    }

    a.specialCards = [{ instanceId: 'sa-1', cardId: 'super-absorber', isUpgraded: false }];
    a.points = 8;
    a.pendingEffects = [];
    state.currentTurnPlayerId = a.id;
    const poolBefore = state.pool.length;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'sa-1' }).ok,
    ).toBe(true);
    expect(a.activePersistentEffects[0]?.cardId).toBe('super-absorber');
    expect(a.activePersistentEffects[0]?.counter).toBe(2);
    expect(state.pool.length).toBe(poolBefore);
  });

  it('on activation absorbs last-turn ledgers of living and in-window eliminated opponents', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
        { id: 'd', nickname: 'D' },
      ],
      seed: 'sa-activation-snapshot',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');
    const d = state.players.find((player) => player.id === 'd');

    if (a === undefined || b === undefined || c === undefined || d === undefined) {
      return;
    }

    a.specialCards = [{ instanceId: 'sa-1', cardId: 'super-absorber', isUpgraded: false }];
    a.points = 8;
    a.lives = 10;
    a.upgradePoints = 0;
    b.turnLedger.pointsSpent = 3;
    b.turnLedger.livesLost = 1;
    c.isEliminated = true;
    c.turnLedger.upgradePointsSpent = 2;
    c.turnLedger.livesLost = 4;
    c.absorbWindowPendingPlayerIds = ['a', 'b', 'd'];
    d.isEliminated = true;
    d.turnLedger.pointsSpent = 9;
    d.absorbWindowPendingPlayerIds = null;
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'sa-1' }).ok,
    ).toBe(true);
    // b: 3 pts + 1 life; c: 2 UP + 4 lives; d out of window → ignored
    expect(a.points).toBe(3);
    expect(a.upgradePoints).toBe(2);
    expect(a.lives).toBe(15);
    expect(a.activePersistentEffects[0]?.cardId).toBe('super-absorber');
  });

  it('upgraded activation doubles the snapshot and later ticks still absorb', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'sa-activation-upgraded',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.specialCards = [
      { instanceId: 'sa-1', cardId: 'super-absorber', isUpgraded: true },
    ];
    a.points = 8;
    a.lives = 10;
    b.turnLedger.pointsSpent = 2;
    b.turnLedger.livesLost = 1;
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'sa-1' }).ok,
    ).toBe(true);
    expect(a.points).toBe(4);
    expect(a.lives).toBe(12);

    a.points = 0;
    a.lives = 10;
    b.turnLedger.pointsSpent = 5;
    b.turnLedger.livesLost = 0;
    applyPersistentEffects(state, b.id);
    expect(a.points).toBe(10);
  });
});
