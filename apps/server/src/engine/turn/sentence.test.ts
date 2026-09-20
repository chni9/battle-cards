/**
 * Sentence — rules spec §5, backlog L5-07 / L63-03.
 */

import { describe, expect, it } from 'vitest';

import { createRng } from '../rng';
import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';
import { queueEffect } from './queue-effect';

function seatPair(seed: string) {
  const state = createInitialState({
    seats: [
      { id: 'a', nickname: 'A' },
      { id: 'b', nickname: 'B' },
    ],
    seed,
  });
  const a = state.players.find((player) => player.id === 'a');
  const b = state.players.find((player) => player.id === 'b');

  if (a === undefined || b === undefined) {
    throw new Error('missing seats');
  }

  a.pendingEffects = [];
  b.pendingEffects = [];
  return { state, a, b };
}

function passUntil(state: ReturnType<typeof createInitialState>, playerId: string): void {
  let guard = 0;
  while (state.currentTurnPlayerId !== playerId) {
    const current = state.currentTurnPlayerId;
    if (current === null) {
      throw new Error('no current turn');
    }
    const result = performTurnAction(state, current, { type: 'draw' });
    if (!result.ok) {
      throw new Error('draw failed while passing');
    }
    guard += 1;
    if (guard > 8) {
      throw new Error('passUntil looped');
    }
  }
}

describe('Sentence (L63-03)', () => {
  it('costs 20 points and ticks 3 activator turns including play before queueing', () => {
    const { state, a, b } = seatPair('l63-03-three');
    a.specialCards = [{ instanceId: 'se-1', cardId: 'sentence', isUpgraded: false }];
    a.points = 20;
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'se-1' }).ok,
    ).toBe(true);
    expect(a.points).toBe(0);
    expect(state.pendingSentences).toEqual([
      { sourcePlayerId: a.id, remainingOwnerTurns: 2, isUpgraded: false },
    ]);
    expect([...a.pendingEffects, ...b.pendingEffects].some((effect) => effect.cardId === 'sentence')).toBe(
      false,
    );

    passUntil(state, a.id);
    expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);
    expect(state.pendingSentences[0]?.remainingOwnerTurns).toBe(1);

    passUntil(state, a.id);
    expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);
    expect(state.pendingSentences).toEqual([]);
    const pending = [...a.pendingEffects, ...b.pendingEffects].find(
      (effect) => effect.cardId === 'sentence',
    );
    expect(pending).toBeDefined();
    expect(pending?.sourcePlayerId).toBe(a.id);
  });

  it('reproducible fire with a fixed seed; base can self-target', () => {
    const seed = 'l63-03-sentence';

    const run = (): string | undefined => {
      const { state, a, b } = seatPair(seed);
      a.specialCards = [{ instanceId: 'se-1', cardId: 'sentence', isUpgraded: false }];
      a.points = 20;
      state.currentTurnPlayerId = a.id;
      state.turnSequence = 0;

      const rng = createRng(`${seed}:turn:0`);
      expect(
        performTurnAction(state, a.id, { type: 'playCard', instanceId: 'se-1' }, rng).ok,
      ).toBe(true);

      passUntil(state, a.id);
      expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);
      passUntil(state, a.id);
      expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);

      const pending = [...a.pendingEffects, ...b.pendingEffects].find(
        (effect) => effect.cardId === 'sentence',
      );
      return pending?.targetPlayerId;
    };

    expect(run()).toBe(run());
  });

  it('upgraded excludes the user from the draw', () => {
    const { state, a, b } = seatPair('l63-03-up');
    a.specialCards = [{ instanceId: 'se-1', cardId: 'sentence', isUpgraded: true }];
    a.points = 20;
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'se-1' }).ok,
    ).toBe(true);
    passUntil(state, a.id);
    expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);
    passUntil(state, a.id);
    expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);

    expect(a.pendingEffects.some((effect) => effect.cardId === 'sentence')).toBe(false);
    expect(b.pendingEffects.some((effect) => effect.cardId === 'sentence')).toBe(true);
  });

  it('cancels if the activator dies before fire', () => {
    const { state, a, b } = seatPair('l63-03-cancel');
    a.specialCards = [{ instanceId: 'se-1', cardId: 'sentence', isUpgraded: false }];
    a.points = 20;
    a.lives = 1;
    a.shield = 0;
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'se-1' }).ok,
    ).toBe(true);
    expect(state.pendingSentences).toHaveLength(1);

    queueEffect({
      state,
      sourcePlayerId: b.id,
      targetPlayerId: a.id,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    passUntil(state, a.id);
    expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);
    expect(a.isEliminated).toBe(true);
    expect(state.pendingSentences).toEqual([]);
    expect(b.pendingEffects.some((effect) => effect.cardId === 'sentence')).toBe(false);
  });

  it('excludes invisible seats at fire; 2p upgraded vs only self fizzles', () => {
    const { state, a, b } = seatPair('l63-03-invis');
    a.specialCards = [{ instanceId: 'se-1', cardId: 'sentence', isUpgraded: true }];
    a.points = 20;
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'se-1' }).ok,
    ).toBe(true);

    b.activePersistentEffects = [
      makeCounterEffect({ id: 'inv-1', cardId: 'invisibility', counter: 7 }),
    ];

    passUntil(state, a.id);
    expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);
    passUntil(state, a.id);
    expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);

    expect(state.pendingSentences).toEqual([]);
    expect([...a.pendingEffects, ...b.pendingEffects].some((effect) => effect.cardId === 'sentence')).toBe(
      false,
    );
  });

  it('life loss still happens on the victim’s turn', () => {
    const { state, a, b } = seatPair('l63-03-delay');
    a.specialCards = [{ instanceId: 'se-1', cardId: 'sentence', isUpgraded: true }];
    a.points = 20;
    b.lives = 10;
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'se-1' }).ok,
    ).toBe(true);
    passUntil(state, a.id);
    expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);
    passUntil(state, a.id);
    expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);

    expect(b.pendingEffects.some((effect) => effect.cardId === 'sentence')).toBe(true);
    expect(b.lives).toBe(10);
    expect(b.isEliminated).toBe(false);

    passUntil(state, b.id);
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(b.lives).toBe(0);
    expect(b.isEliminated).toBe(true);
  });
});
