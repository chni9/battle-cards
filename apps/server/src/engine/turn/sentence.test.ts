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

function takeOwnTurns(
  state: ReturnType<typeof createInitialState>,
  playerId: string,
  count: number,
): void {
  for (let i = 0; i < count; i += 1) {
    passUntil(state, playerId);
    const result = performTurnAction(state, playerId, { type: 'draw' });
    if (!result.ok) {
      throw new Error('own-turn draw failed');
    }
  }
}

describe('Sentence (L63-03)', () => {
  it('costs 20 points and waits 3 later activator turns before queueing', () => {
    const { state, a, b } = seatPair('l63-03-three');
    a.specialCards = [{ instanceId: 'se-1', cardId: 'sentence', isUpgraded: false }];
    a.points = 20;
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'se-1' }).ok,
    ).toBe(true);
    expect(a.points).toBe(0);
    expect(state.pendingSentences).toEqual([
      { sourcePlayerId: a.id, remainingOwnerTurns: 3, isUpgraded: false },
    ]);
    expect([...a.pendingEffects, ...b.pendingEffects].some((effect) => effect.cardId === 'sentence')).toBe(
      false,
    );

    passUntil(state, a.id);
    expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);
    expect(state.pendingSentences[0]?.remainingOwnerTurns).toBe(2);

    passUntil(state, a.id);
    expect(performTurnAction(state, a.id, { type: 'draw' }).ok).toBe(true);
    expect(state.pendingSentences[0]?.remainingOwnerTurns).toBe(1);
    expect([...a.pendingEffects, ...b.pendingEffects].some((effect) => effect.cardId === 'sentence')).toBe(
      false,
    );

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

      takeOwnTurns(state, a.id, 3);

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
    takeOwnTurns(state, a.id, 3);

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

    takeOwnTurns(state, a.id, 3);

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
    takeOwnTurns(state, a.id, 3);

    expect(b.pendingEffects.some((effect) => effect.cardId === 'sentence')).toBe(true);
    expect(b.lives).toBe(10);
    expect(b.isEliminated).toBe(false);

    passUntil(state, b.id);
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(b.lives).toBe(0);
    expect(b.isEliminated).toBe(true);
  });

  it('logs countdown only when the caster’s remaining count decrements', () => {
    const { state, a, b } = seatPair('l63-03-countdown-log');
    a.specialCards = [{ instanceId: 'se-1', cardId: 'sentence', isUpgraded: true }];
    a.points = 20;
    state.currentTurnPlayerId = a.id;

    const played = performTurnAction(state, a.id, { type: 'playCard', instanceId: 'se-1' });
    expect(played.ok).toBe(true);
    if (!played.ok) {
      return;
    }
    expect(played.sentenceAnnouncements ?? []).toEqual([]);

    passUntil(state, b.id);
    const other = performTurnAction(state, b.id, { type: 'draw' });
    expect(other.ok).toBe(true);
    if (!other.ok) {
      return;
    }
    expect(other.sentenceAnnouncements ?? []).toEqual([]);
    expect(state.pendingSentences[0]?.remainingOwnerTurns).toBe(3);

    passUntil(state, a.id);
    const firstTick = performTurnAction(state, a.id, { type: 'draw' });
    expect(firstTick.ok).toBe(true);
    if (!firstTick.ok) {
      return;
    }
    expect(firstTick.sentenceAnnouncements).toEqual([
      {
        kind: 'sentenceCountdown',
        sourcePlayerId: a.id,
        remainingOwnerTurns: 2,
        turnSequence: firstTick.actionPlayed.turnSequence,
      },
    ]);

    passUntil(state, a.id);
    const secondTick = performTurnAction(state, a.id, { type: 'draw' });
    expect(secondTick.ok).toBe(true);
    if (!secondTick.ok) {
      return;
    }
    expect(secondTick.sentenceAnnouncements).toEqual([
      {
        kind: 'sentenceCountdown',
        sourcePlayerId: a.id,
        remainingOwnerTurns: 1,
        turnSequence: secondTick.actionPlayed.turnSequence,
      },
    ]);
  });

  it('names the victim when Sentence fires', () => {
    const { state, a, b } = seatPair('l63-03-fire-log');
    a.specialCards = [{ instanceId: 'se-1', cardId: 'sentence', isUpgraded: true }];
    a.points = 20;
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'se-1' }).ok,
    ).toBe(true);
    takeOwnTurns(state, a.id, 2);

    passUntil(state, a.id);
    const fired = performTurnAction(state, a.id, { type: 'draw' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) {
      return;
    }
    expect(fired.sentenceAnnouncements).toEqual([
      {
        kind: 'sentenceFired',
        sourcePlayerId: a.id,
        targetPlayerId: b.id,
        turnSequence: fired.actionPlayed.turnSequence,
      },
    ]);
    expect(b.pendingEffects.some((effect) => effect.cardId === 'sentence')).toBe(true);
  });
});
