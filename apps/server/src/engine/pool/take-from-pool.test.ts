/**
 * Pool removal — technical spec v4 §4.2, §4.3, backlog L20-14.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { transferCardInstance } from '../kits/acquire-card';
import { createInitialState } from '../create-initial-state';
import { sellCard } from '../economy/sell-card';
import { poolDeactivatedPersistentEffects } from '../specials/pool-deactivated';
import { takeFromPool } from './take-from-pool';

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

describe('takeFromPool (technical spec v4 §4.2 / L20-14)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('removes and returns the instance matching instanceId', () => {
    const state = createInitialState({ seats, seed: 'take-from-pool-remove' });
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

    const sold = sellCard(state, actorId, first.instanceId);

    expect(sold.ok).toBe(true);
    expect(state.pool).toHaveLength(1);

    const taken = takeFromPool(state, first.instanceId);

    expect(taken).toEqual(first);
    expect(state.pool).toHaveLength(0);
    expect(state.pool.some((card) => card.instanceId === first.instanceId)).toBe(false);
  });

  it('returns undefined when the instance is not in the pool', () => {
    const state = createInitialState({ seats, seed: 'take-from-pool-missing' });

    poolDeactivatedPersistentEffects(state, [
      makeCounterEffect({ id: 'pg-1', cardId: 'points-generator' }),
    ]);

    const before = state.pool.length;
    const taken = takeFromPool(state, 'not-in-pool');

    expect(taken).toBeUndefined();
    expect(state.pool).toHaveLength(before);
  });

  it('preserves §10.4 uniqueness after removal and re-mint without resetting nextPoolInstanceSeq', () => {
    const state = createInitialState({ seats, seed: 'take-from-pool-invariant' });
    const actor = state.players[0];

    expect(actor).toBeDefined();

    if (actor === undefined) {
      return;
    }

    poolDeactivatedPersistentEffects(state, [
      makeCounterEffect({ id: 'pg-a', cardId: 'points-generator' }),
      makeCounterEffect({ id: 'pg-b', cardId: 'points-generator' }),
    ]);

    const idsAfterGrowth = state.pool.map((card) => card.instanceId);
    const seqBeforeRemoval = state.nextPoolInstanceSeq;

    expect(state.pool[0]).toBeDefined();

    if (state.pool[0] === undefined) {
      return;
    }

    const targetId = state.pool[0].instanceId;
    const taken = takeFromPool(state, targetId);

    expect(taken?.instanceId).toBe(targetId);
    expect(state.nextPoolInstanceSeq).toBe(seqBeforeRemoval);
    assertPoolIdsUnique(state.pool);
    expect(countZonesHolding(state, targetId)).toBe(0);

    expect(taken).toBeDefined();

    if (taken === undefined) {
      return;
    }

    transferCardInstance(actor, taken);
    expect(countZonesHolding(state, targetId)).toBe(1);
    assertPoolIdsUnique(state.pool);

    poolDeactivatedPersistentEffects(state, [
      makeCounterEffect({ id: 'pg-c', cardId: 'points-generator' }),
    ]);

    expect(state.nextPoolInstanceSeq).toBe(seqBeforeRemoval + 1);
    assertPoolIdsUnique(state.pool);

    const allMintedIds = [...idsAfterGrowth, state.pool[1]?.instanceId];
    expect(new Set(allMintedIds).size).toBe(3);
    expect(state.pool.map((card) => card.instanceId)).not.toContain(targetId);
  });
});
