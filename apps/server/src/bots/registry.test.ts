/**
 * Policy registry — technical spec v5 §7.1 (L32-02).
 */

import { describe, expect, it } from 'vitest';

import { runSimulatedGame } from '../simulation/run-game';
import {
  DEFAULT_POLICY_ID,
  HEURISTIC_V4_POLICY_ID,
  RANDOM_LEGAL_POLICY_ID,
  getDefaultPolicy,
  getPolicy,
  listPolicyIds,
} from './registry';

describe('policy registry (L32-02)', () => {
  it('registers heuristic-v4 and random-legal', () => {
    expect(listPolicyIds()).toEqual([HEURISTIC_V4_POLICY_ID, RANDOM_LEGAL_POLICY_ID].sort());
    expect(DEFAULT_POLICY_ID).toBe(HEURISTIC_V4_POLICY_ID);
    expect(getDefaultPolicy().id).toBe(HEURISTIC_V4_POLICY_ID);
    expect(getPolicy(RANDOM_LEGAL_POLICY_ID).id).toBe(RANDOM_LEGAL_POLICY_ID);
    expect(getPolicy(HEURISTIC_V4_POLICY_ID).weightsHash.length).toBeGreaterThan(0);
  });

  it('runs a full simulated game with a different policy per seat', () => {
    const result = runSimulatedGame({
      seed: 'l32-02-mixed-policy',
      playerCount: 2,
      difficulties: ['hard', 'hard'],
      kitAssignment: ['assassin', 'kamikaze'],
      policyIds: [HEURISTIC_V4_POLICY_ID, RANDOM_LEGAL_POLICY_ID],
    });

    expect(result.winnerPlayerId).toMatch(/^bot-/);
    expect(result.players).toHaveLength(2);
    expect(result.turnSequence).toBeGreaterThan(0);
  });
});
