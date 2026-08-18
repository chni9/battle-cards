/**
 * Registry + tuned default — L32-02 / L33-05.
 */

import { describe, expect, it } from 'vitest';

import { runSimulatedGame } from '../simulation/run-game';
import {
  DEFAULT_POLICY_ID,
  HEURISTIC_TUNED_V5_POLICY_ID,
  HEURISTIC_V5_ENGAGE_POLICY_ID,
  HEURISTIC_V4_POLICY_ID,
  RANDOM_LEGAL_POLICY_ID,
  getDefaultPolicy,
  getPolicy,
  listPolicyIds,
} from './registry';

describe('policy registry (L32-02 / L33-05)', () => {
  it('registers heuristic-v4, tuned, engage, search-v5, and random-legal', () => {
    expect(listPolicyIds()).toEqual(
      [
        HEURISTIC_TUNED_V5_POLICY_ID,
        HEURISTIC_V5_ENGAGE_POLICY_ID,
        HEURISTIC_V4_POLICY_ID,
        RANDOM_LEGAL_POLICY_ID,
        'search-v5',
      ].sort(),
    );
    expect(DEFAULT_POLICY_ID).toBe(HEURISTIC_V4_POLICY_ID);
    expect(getDefaultPolicy().id).toBe(HEURISTIC_V4_POLICY_ID);
    expect(getPolicy(RANDOM_LEGAL_POLICY_ID).id).toBe(RANDOM_LEGAL_POLICY_ID);
    expect(getPolicy(HEURISTIC_V4_POLICY_ID).weightsHash.length).toBeGreaterThan(0);
    expect(getPolicy(HEURISTIC_TUNED_V5_POLICY_ID).weightsHash.length).toBeGreaterThan(0);
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

  it('runs a short game with heuristic-tuned-v5 registered', () => {
    const result = runSimulatedGame({
      seed: 'l33-05-tuned-smoke',
      playerCount: 2,
      difficulties: ['hard', 'hard'],
      kitAssignment: ['assassin', 'kamikaze'],
      policyIds: [HEURISTIC_TUNED_V5_POLICY_ID, HEURISTIC_V4_POLICY_ID],
      maxTurns: 80,
    });

    expect(result.players).toHaveLength(2);
    expect(result.turnSequence).toBeGreaterThan(0);
  });
});
