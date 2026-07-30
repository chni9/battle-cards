/**
 * Sentence — rules spec §5, backlog L5-07.
 */

import { describe, expect, it } from 'vitest';

import { createRng } from '../rng';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Sentence (L5-07)', () => {
  it('reproducible draw with a fixed seed; base can self-target', () => {
    const seed = 'l5-07-sentence';
    const seats = [
      { id: 'a', nickname: 'A' },
      { id: 'b', nickname: 'B' },
    ] as const;

    const run = (): string | undefined => {
      const state = createInitialState({ seats, seed });
      const a = state.players.find((player) => player.id === 'a');
      const b = state.players.find((player) => player.id === 'b');

      if (a === undefined || b === undefined) {
        return undefined;
      }

      a.specialCards = [{ instanceId: 'se-1', cardId: 'sentence', isUpgraded: false }];
      a.points = 15;
      a.pendingEffects = [];
      b.pendingEffects = [];
      state.currentTurnPlayerId = a.id;
      state.turnSequence = 0;

      const rng = createRng(`${seed}:turn:0`);
      expect(
        performTurnAction(state, a.id, { type: 'playCard', instanceId: 'se-1' }, rng).ok,
      ).toBe(true);

      const pending = [...a.pendingEffects, ...b.pendingEffects].find(
        (effect) => effect.cardId === 'sentence',
      );
      return pending?.targetPlayerId;
    };

    expect(run()).toBe(run());
  });

  it('upgraded excludes the user from the draw', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l5-07-up',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      return;
    }

    a.specialCards = [{ instanceId: 'se-1', cardId: 'sentence', isUpgraded: true }];
    a.points = 15;
    a.pendingEffects = [];
    b.pendingEffects = [];
    state.currentTurnPlayerId = a.id;

    expect(
      performTurnAction(state, a.id, { type: 'playCard', instanceId: 'se-1' }).ok,
    ).toBe(true);
    expect(a.pendingEffects.some((effect) => effect.cardId === 'sentence')).toBe(false);
    expect(b.pendingEffects.some((effect) => effect.cardId === 'sentence')).toBe(true);
  });
});
