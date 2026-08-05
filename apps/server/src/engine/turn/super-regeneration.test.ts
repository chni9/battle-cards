/**
 * Super Regeneration — rules spec §5, backlog L21-02.
 */

import { CLASSIC_LIFE_LIMIT } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('Super Regeneration (L21-02)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('base: gains 9 lives and pays the 6-point Price', () => {
    const state = createInitialState({ seats, seed: 'l21-02-sr-base' });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      throw new Error('missing actor');
    }

    actor.lives = 10;
    actor.points = 6;
    actor.specialCards = [
      { instanceId: 'sr-1', cardId: 'super-regeneration', isUpgraded: false },
    ];
    actor.pendingEffects = [];
    state.currentTurnPlayerId = actor.id;

    expect(
      performTurnAction(state, actor.id, { type: 'playCard', instanceId: 'sr-1' }).ok,
    ).toBe(true);
    expect(actor.lives).toBe(19);
    expect(actor.points).toBe(0);
    expect(actor.specialCards).toHaveLength(0);
  });

  it('upgraded: gains 18 lives', () => {
    const state = createInitialState({ seats, seed: 'l21-02-sr-up' });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      throw new Error('missing actor');
    }

    actor.lives = 5;
    actor.points = 6;
    actor.specialCards = [
      { instanceId: 'sr-1', cardId: 'super-regeneration', isUpgraded: true },
    ];
    actor.pendingEffects = [];
    state.currentTurnPlayerId = actor.id;

    expect(
      performTurnAction(state, actor.id, { type: 'playCard', instanceId: 'sr-1' }).ok,
    ).toBe(true);
    expect(actor.lives).toBe(23);
  });

  it('clamps at GameState.lifeLimit', () => {
    const state = createInitialState({ seats, seed: 'l21-02-sr-cap' });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      throw new Error('missing actor');
    }

    actor.lives = CLASSIC_LIFE_LIMIT - 2;
    actor.points = 6;
    actor.specialCards = [
      { instanceId: 'sr-1', cardId: 'super-regeneration', isUpgraded: false },
    ];
    actor.pendingEffects = [];
    state.currentTurnPlayerId = actor.id;

    expect(
      performTurnAction(state, actor.id, { type: 'playCard', instanceId: 'sr-1' }).ok,
    ).toBe(true);
    expect(actor.lives).toBe(CLASSIC_LIFE_LIMIT);
  });
});
