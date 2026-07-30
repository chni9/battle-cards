/**
 * Internal counters + persistent turn step — rules spec §5, backlog L5-02.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('internal counters → pool (L5-02)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('sends a deactivated counter card to the shared pool after attack damage', () => {
    const state = createInitialState({ seats, seed: 'l5-02-pool' });
    const attacker = state.players.find((player) => player.id === 'a');
    const defender = state.players.find((player) => player.id === 'b');

    if (attacker === undefined || defender === undefined) {
      return;
    }

    defender.activePersistentEffects = [
      makeCounterEffect({ id: 'pg-live', cardId: 'points-generator', counter: 1 }),
    ];
    defender.lives = 10;
    defender.shield = 0;

    attacker.hand = [{ instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false }];
    attacker.points = 1;
    state.currentTurnPlayerId = attacker.id;

    const play = performTurnAction(state, attacker.id, {
      type: 'playCard',
      instanceId: 'atk-1',
      targetPlayerId: defender.id,
    });

    expect(play.ok).toBe(true);

    // Defender's turn: resolve the pending attack.
    state.currentTurnPlayerId = defender.id;
    defender.points = 1;
    const resolve = performTurnAction(state, defender.id, { type: 'draw' });

    expect(resolve.ok).toBe(true);
    expect(defender.activePersistentEffects).toHaveLength(0);
    expect(state.pool.some((card) => card.cardId === 'points-generator')).toBe(true);
  });

  it('tax life loss does not deactivate or pool a counter card', () => {
    const state = createInitialState({ seats, seed: 'l5-02-tax' });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      return;
    }

    actor.activePersistentEffects = [
      makeCounterEffect({ id: 'pg-live', cardId: 'points-generator', counter: 3 }),
    ];
    actor.lives = 5;
    actor.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    state.currentTurnPlayerId = actor.id;
    const poolBefore = state.pool.length;

    const result = performTurnAction(state, actor.id, {
      type: 'playCard',
      instanceId: 'tax-1',
    });

    expect(result.ok).toBe(true);
    expect(actor.activePersistentEffects[0]?.counter).toBe(3);
    expect(state.pool.length).toBe(poolBefore);
  });
});
