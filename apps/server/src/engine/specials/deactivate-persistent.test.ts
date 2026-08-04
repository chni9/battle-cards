/**
 * deactivatePersistentEffect — technical spec v4 §4.2, L20-13.
 */

import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { deactivatePersistentEffect } from './deactivate-persistent';

describe('deactivatePersistentEffect (technical spec v4 §4.2, L20-13)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('deactivates a persistent with counter null manually and lands in the pool exactly once', () => {
    const state = createInitialState({ seats, seed: 'l20-13-deactivate' });
    const owner = state.players[0];

    expect(owner).toBeDefined();

    if (owner === undefined) {
      return;
    }

    const effect = makeCounterEffect({
      id: 'invis-a',
      cardId: 'cloning',
      counter: null,
    });
    owner.activePersistentEffects.push(effect);

    expect(state.pool).toHaveLength(0);

    const ok = deactivatePersistentEffect(state, owner.id, effect.id);

    expect(ok).toBe(true);
    expect(owner.activePersistentEffects).toHaveLength(0);
    expect(state.pool).toHaveLength(1);
    expect(state.pool[0]?.cardId).toBe(effect.cardId);
    expect(state.pool[0]?.isUpgraded).toBe(effect.isUpgraded);

    const again = deactivatePersistentEffect(state, owner.id, effect.id);

    expect(again).toBe(false);
    expect(state.pool).toHaveLength(1);
  });
});
