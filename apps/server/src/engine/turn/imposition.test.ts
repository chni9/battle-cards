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

  it('transfers 2 points when the target can pay', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l63-04-pts',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing seats');
    }

    a.specialCards = [{ instanceId: 'imp-1', cardId: 'imposition', isUpgraded: false }];
    a.points = 6;
    a.pendingEffects = [];
    b.points = 10;
    b.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'imp-1' }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = b.id;
    const before = b.points;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(b.points).toBe(before + 1 - 2);
    expect(a.points).toBe(2);
    expect(b.lives).toBeGreaterThan(0);
  });

  it('upgraded skips below 4 points and takes 4 when they can pay', () => {
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
    b.points = 3;
    applyPersistentEffects(state, b.id);
    expect(b.points).toBe(3);
    expect(b.lives).toBe(10);
    expect(a.points).toBe(0);

    b.points = 4;
    applyPersistentEffects(state, b.id);
    expect(b.points).toBe(0);
    expect(b.lives).toBe(10);
    expect(a.points).toBe(4);
  });
});
