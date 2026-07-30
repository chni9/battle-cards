/**
 * Spy Thief — rules spec §5, backlog L5-04.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Spy Thief (L5-04)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
    { id: 'c', nickname: 'Carol' },
  ] as const;

  it('steals all points from all opponents uncapped and spies on each', () => {
    const state = createInitialState({ seats, seed: 'l5-04-base' });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      return;
    }

    a.specialCards = [{ instanceId: 'st-1', cardId: 'spy-thief', isUpgraded: false }];
    a.points = 5;
    a.pendingEffects = [];
    b.points = 25;
    b.pendingEffects = [];
    b.shield = 4;
    b.shieldIsUpgraded = true;
    c.points = 8;
    c.pendingEffects = [];
    c.kitId = 'untouchable';

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'st-1' }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = b.id;
    const bPointsBefore = b.points;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    // Draw adds kit draw points before Spy Thief resolves and steals everything.
    expect(b.points).toBe(0);
    expect(a.points).toBe(bPointsBefore + 1); // kamikaze/assassin/etc. draw is 1 in V1
    expect(state.visibility.some((r) => r.viewerId === 'a' && r.subjectId === 'b')).toBe(true);

    const aAfterB = a.points;
    state.currentTurnPlayerId = c.id;
    const cPointsBefore = c.points;
    expect(performTurnAction(state, c.id, { type: 'draw' }).ok).toBe(true);
    expect(c.points).toBe(0);
    expect(a.points).toBe(aAfterB + cPointsBefore + 1);
    expect(state.visibility.some((r) => r.viewerId === 'a' && r.subjectId === 'c')).toBe(true);
  });

  it('upgraded doubles stolen points and grants full-resources visibility', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l5-04-up',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.specialCards = [{ instanceId: 'st-1', cardId: 'spy-thief', isUpgraded: true }];
    a.points = 5;
    a.pendingEffects = [];
    b.points = 10;
    b.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'st-1' }).ok,
    ).toBe(true);

    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(b.points).toBe(0);
    // 10 + 1 draw, doubled = 22; a paid 5 so started resolve at 0 → 22
    expect(a.points).toBe(22);
    expect(
      state.visibility.find((r) => r.viewerId === 'a' && r.subjectId === 'b')?.level,
    ).toBe('full-resources');
  });
});
