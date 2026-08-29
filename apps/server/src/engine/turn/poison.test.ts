/**
 * Poison — rules spec §5, backlog L22-01.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { applyPersistentEffects } from './apply-persistent-effects';
import { performTurnAction } from './perform-action';

describe('Poison (L22-01)', () => {
  it('base costs 1 life per victim turn; upgraded costs 2', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-01-base',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'poi', cardId: 'poison', counter: 3 }),
    ];
    b.lives = 10;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(9);

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'poi-u', cardId: 'poison', isUpgraded: true, counter: 3 }),
    ];
    b.lives = 10;
    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(8);
  });

  it('ticks each of 3 opponents independently (4-player table)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
        { id: 'd', nickname: 'D' },
      ],
      seed: 'l22-01-4p',
    });
    const a = state.players.find((player) => player.id === 'a');
    const others = state.players.filter((player) => player.id !== 'a');

    if (a === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'poi', cardId: 'poison', counter: 3 }),
    ];

    for (const victim of others) {
      victim.lives = 10;
      applyPersistentEffects(state, victim.id);
      expect(victim.lives).toBe(9);
    }

    expect(a.lives).toBeGreaterThan(0);
    applyPersistentEffects(state, a.id);
    // Owner does not poison themselves.
    expect(a.activePersistentEffects[0]?.counter).toBe(3);
  });

  it('ticks each of 5 opponents independently (6-player table)', () => {
    const seats = Array.from({ length: 6 }, (_, index) => ({
      id: String.fromCodePoint(97 + index),
      nickname: `P${String(index)}`,
    }));
    const state = createInitialState({
      seats,
      seed: 'l22-01-6p',
    });
    const a = state.players.find((player) => player.id === 'a');
    const others = state.players.filter((player) => player.id !== 'a');

    if (a === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'poi', cardId: 'poison', counter: 3 }),
    ];

    expect(others).toHaveLength(5);
    for (const victim of others) {
      victim.lives = 10;
      applyPersistentEffects(state, victim.id);
      expect(victim.lives).toBe(9);
    }
  });

  it('ticks each of 2 opponents on a 3-player table', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'l22-01-3p',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'poi', cardId: 'poison', counter: 3 }),
    ];
    b.lives = 8;
    c.lives = 8;

    applyPersistentEffects(state, b.id);
    applyPersistentEffects(state, c.id);
    expect(b.lives).toBe(7);
    expect(c.lives).toBe(7);
  });

  it('counter is unchanged by poison ticks and tax; depletes on owner damage then pools', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-01-counter',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'poi', cardId: 'poison', counter: 1 }),
    ];
    a.lives = 10;
    a.shield = 0;
    b.lives = 10;

    applyPersistentEffects(state, b.id);
    expect(a.activePersistentEffects[0]?.counter).toBe(1);

    a.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    state.currentTurnPlayerId = a.id;
    expect(performTurnAction(state, a.id, { type: 'playCard', instanceId: 'tax-1' }).ok).toBe(
      true,
    );
    expect(a.activePersistentEffects[0]?.counter).toBe(1);

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
    expect(state.pool.some((card) => card.cardId === 'poison')).toBe(true);
  });

  it('records elimination contributor when a tick kills', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-01-kill',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.activePersistentEffects = [
      makeCounterEffect({ id: 'poi', cardId: 'poison', counter: 3 }),
    ];
    b.lives = 1;

    applyPersistentEffects(state, b.id);
    expect(b.lives).toBe(0);
    expect(
      state.eliminationContributors.some(
        (entry) => entry.victimPlayerId === 'b' && entry.sourcePlayerId === 'a',
      ),
    ).toBe(true);
  });

  it('activates via playCard and does not pool the copy on play', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l22-01-play',
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      return;
    }

    a.specialCards = [{ instanceId: 'poi-1', cardId: 'poison', isUpgraded: false }];
    a.points = 8;
    a.pendingEffects = [];
    state.currentTurnPlayerId = a.id;
    const poolBefore = state.pool.length;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'poi-1' }).ok,
    ).toBe(true);
    expect(a.activePersistentEffects).toHaveLength(1);
    expect(a.activePersistentEffects[0]?.cardId).toBe('poison');
    expect(a.activePersistentEffects[0]?.counter).toBe(3);
    expect(a.activePersistentEffects[0]?.targetPlayerId).toBeNull();
    expect(state.pool.length).toBe(poolBefore);
  });
});
