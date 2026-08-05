/**
 * Curse — rules spec §5, backlog L22-02, #V4-20.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { applyPersistentEffects } from './apply-persistent-effects';
import { performTurnAction } from './perform-action';

describe('Curse (L22-02)', () => {
  it('7 points spent costs 2 lives base; remainder discarded', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-02-7pts',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: 'b',
      }),
    ];
    b.lives = 10;
    b.turnLedger.pointsSpent = 7;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(8);
    expect(a.activePersistentEffects).toHaveLength(1);
  });

  it('upgraded costs 1 life per 2 points spent', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-02-up',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        isUpgraded: true,
        counter: null,
        targetPlayerId: 'b',
      }),
    ];
    b.lives = 10;
    b.turnLedger.pointsSpent = 5;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(8);
  });

  it('theft-only point loss does not trigger Curse', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-02-theft',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: 'b',
      }),
    ];
    b.lives = 10;
    b.turnLedger.pointsSpent = 0;
    b.turnLedger.pointsLostToTheft = 9;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(10);
  });

  it('victim at 2 spending 6 ends at 1 and Curse is permanently pooled', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-02-floor',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: 'b',
      }),
    ];
    b.lives = 2;
    b.turnLedger.pointsSpent = 6;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(1);
    expect(a.activePersistentEffects).toHaveLength(0);
    expect(state.pool.some((card) => card.cardId === 'curse')).toBe(true);
  });

  it('victim already at 1 deactivates Curse without further loss', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-02-at1',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-1',
        cardId: 'curse',
        counter: null,
        targetPlayerId: 'b',
      }),
    ];
    b.lives = 1;
    b.turnLedger.pointsSpent = 99;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(1);
    expect(a.activePersistentEffects).toHaveLength(0);
    expect(state.pool.some((card) => card.cardId === 'curse')).toBe(true);
  });

  it('activates via playCard with target and stores targetPlayerId', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-02-play',
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      return;
    }

    a.specialCards = [{ instanceId: 'curse-1', cardId: 'curse', isUpgraded: false }];
    a.points = 8;
    a.pendingEffects = [];
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, {
        type: 'playCard',
        instanceId: 'curse-1',
        targetPlayerId: 'b',
      }).ok,
    ).toBe(true);
    expect(a.activePersistentEffects[0]?.cardId).toBe('curse');
    expect(a.activePersistentEffects[0]?.counter).toBeNull();
    expect(a.activePersistentEffects[0]?.targetPlayerId).toBe('b');
  });
});
