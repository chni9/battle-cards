/**
 * Pool instance ids must stay unique across shrink-then-grow — L20-01 / tech v4 §3.3 #1.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { poolDeactivatedPersistentEffects } from './pool-deactivated';

describe('poolDeactivatedPersistentEffects instance ids (L20-01)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('never reuses an instanceId after the pool shrinks then grows again', () => {
    const state = createInitialState({ seats, seed: 'l20-01-pool-ids' });

    poolDeactivatedPersistentEffects(state, [
      makeCounterEffect({ id: 'pg-1', cardId: 'points-generator' }),
      makeCounterEffect({ id: 'pg-2', cardId: 'points-generator' }),
    ]);

    expect(state.pool).toHaveLength(2);
    const idsAfterGrowth = state.pool.map((card) => card.instanceId);
    expect(new Set(idsAfterGrowth).size).toBe(2);

    // Remove the first entry (index 0). Length-based minting would then reuse `:0`.
    const [removed] = state.pool.splice(0, 1);
    expect(removed).toBeDefined();
    expect(state.pool).toHaveLength(1);

    poolDeactivatedPersistentEffects(state, [
      makeCounterEffect({ id: 'pg-3', cardId: 'points-generator' }),
    ]);

    expect(state.pool).toHaveLength(2);
    const allMintedIds = [...idsAfterGrowth, state.pool[1]?.instanceId];
    expect(allMintedIds.every((id) => id !== undefined)).toBe(true);
    expect(new Set(allMintedIds).size).toBe(3);
    expect(state.pool[1]?.instanceId).not.toBe(removed?.instanceId);
    expect(state.pool.map((card) => card.instanceId)).not.toContain(removed?.instanceId);
  });
});
