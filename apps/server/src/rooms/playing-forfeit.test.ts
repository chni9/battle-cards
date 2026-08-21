/**
 * Playing-phase FORFEIT helper — technical spec v6 §6.3 / L43-06.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../engine/create-initial-state';
import { applyPlayingForfeit } from './playing-forfeit';

describe('applyPlayingForfeit (L43-06)', () => {
  it('eliminates the 2p forfeiter with a sole survivor and no reward queue', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l43-06-2p',
    });

    const result = applyPlayingForfeit(state, 'a');
    const alice = state.players.find((player) => player.id === 'a');

    expect(result.eliminated).toBe(true);
    expect(result.soleSurvivorId).toBe('b');
    expect(alice?.isEliminated).toBe(true);
    expect(state.rewardQueue).toHaveLength(0);
  });

  it('eliminates a 3p forfeiter without a sole survivor', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Cara' },
      ],
      seed: 'l43-06-3p',
    });

    const result = applyPlayingForfeit(state, 'a');

    expect(result.eliminated).toBe(true);
    expect(result.soleSurvivorId).toBeNull();
    expect(state.rewardQueue).toHaveLength(0);
  });

  it('no-ops when the seat is already eliminated', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Cara' },
      ],
      seed: 'l43-06-noop',
    });

    expect(applyPlayingForfeit(state, 'a').eliminated).toBe(true);
    const second = applyPlayingForfeit(state, 'a');
    expect(second.eliminated).toBe(false);
    expect(second.soleSurvivorId).toBeNull();
  });
});
