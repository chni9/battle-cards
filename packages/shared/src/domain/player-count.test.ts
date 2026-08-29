/**
 * Classic occupancy constants — designer 2026-08-29 / rules spec §1.
 */

import { describe, expect, it } from 'vitest';

import { MAX_PLAYERS, MIN_PLAYERS, SOLO_OPPONENT_COUNTS } from './player-count';

describe('Classic player count', () => {
  it('caps Classic rooms at 2–6 seats', () => {
    expect(MIN_PLAYERS).toBe(2);
    expect(MAX_PLAYERS).toBe(6);
  });

  it('lists solo opponent counts up to MAX_PLAYERS − 1', () => {
    expect(SOLO_OPPONENT_COUNTS[0]).toBe(1);
    expect(SOLO_OPPONENT_COUNTS[SOLO_OPPONENT_COUNTS.length - 1]).toBe(MAX_PLAYERS - 1);
    expect(SOLO_OPPONENT_COUNTS).toHaveLength(MAX_PLAYERS - MIN_PLAYERS + 1);
  });
});
