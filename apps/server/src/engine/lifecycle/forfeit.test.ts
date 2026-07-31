/**
 * Lifecycle forfeit elim — technical spec §5.7, L7-02…L7-04.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import {
  eliminateWithoutReward,
  findSoleSurvivorId,
} from '../turn/elimination-rewards';

describe('eliminateWithoutReward (L7-02 / L7-04)', () => {
  it('pools cards with no reward and leaves a sole survivor', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'forfeit-seed',
    });
    const alice = state.players.find((player) => player.id === 'a');

    expect(alice).toBeDefined();
    if (alice === undefined) {
      return;
    }

    const handSize = alice.hand.length + alice.specialCards.length;
    expect(eliminateWithoutReward(state, 'a')).toBe(true);
    expect(alice.isEliminated).toBe(true);
    expect(alice.hand).toHaveLength(0);
    expect(alice.specialCards).toHaveLength(0);
    expect(state.pool.length).toBe(handSize);
    expect(state.rewardQueue).toHaveLength(0);
    expect(findSoleSurvivorId(state)).toBe('b');
  });
});
