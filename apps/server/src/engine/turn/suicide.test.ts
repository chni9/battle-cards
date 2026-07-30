/**
 * Suicide — rules spec §5, backlog L5-03.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Suicide (L5-03)', () => {
  const seats = [
    { id: 'kam', nickname: 'Kami' },
    { id: 'o1', nickname: 'Opp1' },
    { id: 'o2', nickname: 'Opp2' },
    { id: 'o3', nickname: 'Opp3' },
  ] as const;

  it('base: eliminates 2 of 3 weak opponents over their turns, then the user', () => {
    const state = createInitialState({ seats, seed: 'l5-03-base' });
    const kam = state.players.find((player) => player.id === 'kam');
    const o1 = state.players.find((player) => player.id === 'o1');
    const o2 = state.players.find((player) => player.id === 'o2');
    const o3 = state.players.find((player) => player.id === 'o3');

    if (kam === undefined || o1 === undefined || o2 === undefined || o3 === undefined) {
      return;
    }

    for (const player of state.players) {
      player.pendingEffects = [];
      player.hand = [];
      player.specialCards = [];
    }

    kam.specialCards = [{ instanceId: 'su-1', cardId: 'suicide', isUpgraded: false }];
    kam.points = 3;
    kam.lives = 10;
    o1.lives = 4;
    o1.points = 7;
    o2.lives = 4;
    o2.points = 3;
    o3.lives = 20;
    o3.points = 9;

    state.currentTurnPlayerId = kam.id;
    const play = performTurnAction(state, kam.id, {
      type: 'playCard',
      instanceId: 'su-1',
    });

    expect(play.ok).toBe(true);
    expect(kam.specialCards).toHaveLength(0);
    expect(state.pool.some((card) => card.instanceId === 'su-1')).toBe(true);
    expect(o1.pendingEffects.some((effect) => effect.cardId === 'suicide')).toBe(true);
    expect(kam.pendingEffects.some((effect) => effect.cardId === 'suicide')).toBe(true);

    // Each opponent acts then resolves Suicide.
    for (const opp of [o1, o2, o3]) {
      state.currentTurnPlayerId = opp.id;
      opp.points = Math.max(opp.points, 1);
      const turn = performTurnAction(state, opp.id, { type: 'draw' });
      expect(turn.ok).toBe(true);
    }

    expect(o1.isEliminated).toBe(true);
    expect(o2.isEliminated).toBe(true);
    expect(o3.isEliminated).toBe(false);
    expect(o3.lives).toBe(15);
    expect(o3.points).toBe(0);
    expect(
      state.eliminationAttributions.some(
        (entry) => entry.eliminatedPlayerId === o1.id && entry.eliminatorPlayerId === kam.id,
      ),
    ).toBe(true);

    // User's next turn: they act, then self-Suicide eliminates them.
    state.currentTurnPlayerId = kam.id;
    kam.points = 1;
    const final = performTurnAction(state, kam.id, { type: 'draw' });

    expect(final.ok).toBe(true);

    if (!final.ok) {
      return;
    }

    expect(kam.isEliminated).toBe(true);
    expect(
      state.eliminationAttributions.some(
        (entry) => entry.eliminatedPlayerId === kam.id && entry.eliminatorPlayerId === null,
      ),
    ).toBe(true);
    expect(final.winnerPlayerId).toBe(o3.id);
  });

  it('upgraded: user survives and does not queue self-elim', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l5-03-up',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.specialCards = [{ instanceId: 'su-1', cardId: 'suicide', isUpgraded: true }];
    a.points = 3;
    a.lives = 10;
    a.pendingEffects = [];
    b.lives = 3;
    b.points = 5;
    b.pendingEffects = [];

    state.currentTurnPlayerId = a.id;
    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'su-1' }).ok,
    ).toBe(true);
    expect(a.pendingEffects).toHaveLength(0);

    state.currentTurnPlayerId = b.id;
    b.points = 1;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(b.isEliminated).toBe(true);
    expect(a.isEliminated).toBe(false);
    expect(
      state.eliminationAttributions.find((entry) => entry.eliminatedPlayerId === b.id)
        ?.eliminatorPlayerId,
    ).toBe(a.id);
  });
});
