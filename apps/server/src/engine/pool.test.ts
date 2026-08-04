/**
 * Shared pool uniqueness — rules spec §1, technical spec v4 §10.4, backlog L20-02.
 *
 * Replaces the V1 "never shrinks" tautology: once Card Absorber can remove from the pool,
 * the invariant is uniqueness of instanceIds and single-zone membership, not monotonic length.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../testing/factories';
import { createInitialState } from './create-initial-state';
import { sellCard } from './economy/sell-card';
import { poolDeactivatedPersistentEffects } from './specials/pool-deactivated';
import { applyDefaultEliminationRewards } from './turn/elimination-rewards';
import { performTurnAction } from './turn/perform-action';
import { queueEffect } from './turn/queue-effect';

function assertPoolIdsUnique(pool: readonly { instanceId: string }[]): void {
  const ids = pool.map((card) => card.instanceId);
  expect(new Set(ids).size).toBe(ids.length);
}

function countZonesHolding(
  state: {
    pool: readonly { instanceId: string }[];
    players: readonly {
      hand: readonly { instanceId: string }[];
      specialCards: readonly { instanceId: string }[];
    }[];
  },
  instanceId: string,
): number {
  let count = 0;

  if (state.pool.some((card) => card.instanceId === instanceId)) {
    count += 1;
  }

  for (const player of state.players) {
    if (
      player.hand.some((card) => card.instanceId === instanceId) ||
      player.specialCards.some((card) => card.instanceId === instanceId)
    ) {
      count += 1;
    }
  }

  return count;
}

describe('shared pool (L20-02 / §10.4)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('keeps every pool instanceId unique across sell, shrink, and re-mint (fails if L20-01 reverted)', () => {
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
    assertPoolIdsUnique(state.pool);
    expect(state.pool[0]?.instanceId).toBe(first.instanceId);
    expect(countZonesHolding(state, first.instanceId)).toBe(1);

    poolDeactivatedPersistentEffects(state, [
      makeCounterEffect({ id: 'pg-a', cardId: 'points-generator' }),
      makeCounterEffect({ id: 'pg-b', cardId: 'points-generator' }),
    ]);
    assertPoolIdsUnique(state.pool);

    // Simulate takeFromPool: move first deactivated card into the actor's specials.
    const [taken] = state.pool.splice(1, 1);
    expect(taken).toBeDefined();

    if (taken === undefined) {
      return;
    }

    actor.specialCards.push(taken);
    assertPoolIdsUnique(state.pool);
    expect(countZonesHolding(state, taken.instanceId)).toBe(1);

    // Re-mint after shrink — length-based ids (pre-L20-01) collide here.
    poolDeactivatedPersistentEffects(state, [
      makeCounterEffect({ id: 'pg-c', cardId: 'points-generator' }),
    ]);
    assertPoolIdsUnique(state.pool);
    expect(countZonesHolding(state, taken.instanceId)).toBe(1);
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
    const specialsSize = defender.specialCards.length;
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
    // Cards are held until elimination rewards complete (Lot 6).
    expect(result.ok && result.rewardChoicePending).toBe(true);
    expect(applyDefaultEliminationRewards(state).ok).toBe(true);
    expect(state.pool.length).toBe(before + handSize + specialsSize);
    assertPoolIdsUnique(state.pool);
    expect(defender.hand).toHaveLength(0);
    expect(defender.specialCards).toHaveLength(0);
  });
});
