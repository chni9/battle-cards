/**
 * Imposition — rules spec §5, backlog L5-05 / L63-04.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { applyPersistentEffects } from './apply-persistent-effects';
import { performTurnAction } from './perform-action';

describe('Imposition (L63-04)', () => {
  it('skips when the target has fewer than 2 points; no lives transfer', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l63-04-skip',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing seats');
    }

    a.activePersistentEffects = [
      { id: 'imp', cardId: 'imposition', isUpgraded: false, counter: 2, targetPlayerId: null },
    ];
    a.lives = 10;
    a.points = 0;
    b.points = 1;
    b.lives = 10;

    applyPersistentEffects(state, b.id);

    expect(b.points).toBe(1);
    expect(b.lives).toBe(10);
    expect(a.lives).toBe(10);
    expect(a.points).toBe(0);
    expect(a.activePersistentEffects).toHaveLength(1);
  });

  it('takes only points above 7, capped at 2, and does not skip the turn', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l67-imposition-floor',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing seats');
    }

    a.activePersistentEffects = [
      { id: 'imp', cardId: 'imposition', isUpgraded: false, counter: 2, targetPlayerId: null },
    ];
    a.points = 0;
    b.points = 7;
    applyPersistentEffects(state, b.id);
    expect(b.points).toBe(7);
    expect(a.points).toBe(0);

    b.points = 8;
    applyPersistentEffects(state, b.id);
    expect(b.points).toBe(7);
    expect(a.points).toBe(1);
    expect(b.turnLedger.pointsLostToTheft).toBe(1);

    b.points = 10;
    applyPersistentEffects(state, b.id);
    expect(b.points).toBe(8);
    expect(a.points).toBe(3);

    b.pendingEffects = [];
    b.hand = [];
    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(state.currentTurnPlayerId).not.toBe(b.id);
  });

  it('upgraded cap is 4 points above 7', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l63-04-up',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing seats');
    }

    a.activePersistentEffects = [
      { id: 'imp', cardId: 'imposition', isUpgraded: true, counter: 2, targetPlayerId: null },
    ];
    a.points = 0;
    a.lives = 10;
    b.lives = 10;
    b.points = 7;
    applyPersistentEffects(state, b.id);
    expect(b.points).toBe(7);
    expect(b.lives).toBe(10);
    expect(a.points).toBe(0);

    b.points = 11;
    applyPersistentEffects(state, b.id);
    expect(b.points).toBe(7);
    expect(b.lives).toBe(10);
    expect(a.points).toBe(4);
  });

  it('upgraded Shield stops the drain and spends no shield (L68-09)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l68-09-shield',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    if (a === undefined || b === undefined) {
      throw new Error('missing seats');
    }

    a.activePersistentEffects = [
      { id: 'imp', cardId: 'imposition', isUpgraded: false, counter: 2, targetPlayerId: null },
    ];
    b.points = 12;
    b.shield = 4;
    b.shieldIsUpgraded = false;
    applyPersistentEffects(state, b.id);
    expect(b.points).toBe(10);
    expect(b.shield).toBe(4);

    b.points = 12;
    b.shieldIsUpgraded = true;
    applyPersistentEffects(state, b.id);
    expect(b.points).toBe(12);
    expect(b.shield).toBe(4);
    expect(a.points).toBe(2);
  });
});
