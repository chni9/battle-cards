/**
 * Imposition — rules spec §5, backlog L5-05.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { applyPersistentEffects } from './apply-persistent-effects';
import { performTurnAction } from './perform-action';

describe('Imposition (L5-05)', () => {
  it('target with 1 point cedes 1 life; user gains it (25-cap)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l5-05-life',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      { id: 'imp', cardId: 'imposition', isUpgraded: false, counter: 2 },
    ];
    a.lives = 24;
    b.points = 1;
    b.lives = 10;

    applyPersistentEffects(state, b.id);

    expect(b.points).toBe(1);
    expect(b.lives).toBe(9);
    expect(a.lives).toBe(25); // capped
  });

  it('cedes points when the target can pay', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l5-05-pts',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
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
    // draw +1 then pay 2
    expect(b.points).toBe(before + 1 - 2);
    expect(a.points).toBe(2);
  });
});
