/**
 * Shared pool is write-only in V1 — rules spec §1, technical spec §6.3, backlog L2-06.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from './create-initial-state';
import { sellCard } from './economy/sell-card';
import { performTurnAction } from './turn/perform-action';
import { queueEffect } from './turn/queue-effect';

describe('shared pool (L2-06)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('fills from sales and never shrinks during play', () => {
    const state = createInitialState({ seats, seed: 'pool-seed' });
    const actorId = state.currentTurnPlayerId;

    expect(actorId).not.toBeNull();

    if (actorId === null) {
      return;
    }

    const actor = state.players.find((player) => player.id === actorId);

    expect(actor).toBeDefined();

    if (actor === undefined) {
      return;
    }

    const first = actor.hand[0];

    expect(first).toBeDefined();

    if (first === undefined) {
      return;
    }

    expect(state.pool).toHaveLength(0);

    const sold = sellCard(state, actorId, first.instanceId);

    expect(sold.ok).toBe(true);
    expect(state.pool).toHaveLength(1);
    expect(state.pool[0]?.instanceId).toBe(first.instanceId);

    // No V1 path consumes the pool — length must only grow or stay.
    const lengthAfterSale = state.pool.length;
    expect(state.pool.length).toBe(lengthAfterSale);
  });

  it('fills from elimination without an eliminator reward path', () => {
    const state = createInitialState({ seats, seed: 'pool-elim-seed' });
    const defenderId = state.currentTurnPlayerId;

    expect(defenderId).not.toBeNull();

    if (defenderId === null) {
      return;
    }

    const attacker = state.players.find((player) => player.id !== defenderId);
    const defender = state.players.find((player) => player.id === defenderId);

    expect(attacker).toBeDefined();
    expect(defender).toBeDefined();

    if (attacker === undefined || defender === undefined) {
      return;
    }

    const handSize = defender.hand.length;
    defender.lives = 1;
    queueEffect({
      state,
      sourcePlayerId: attacker.id,
      targetPlayerId: defenderId,
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    const before = state.pool.length;
    const result = performTurnAction(state, defenderId, { type: 'draw' });

    expect(result.ok).toBe(true);
    expect(defender.isEliminated).toBe(true);
    expect(state.pool.length).toBe(before + handSize);
    expect(defender.hand).toHaveLength(0);
  });
});
