/**
 * Feature snapshot logging — backlog L33-06.
 */

import { describe, expect, it } from 'vitest';

import { HEURISTIC_V4_POLICY_ID } from '../bots/registry';
import { isStallError } from './run-batch';
import { runSimulatedGame } from './run-game';

describe('feature snapshots (L33-06)', () => {
  it('row count matches decisions and labels match the winner', () => {
    let decisions = 0;
    const row = runSimulatedGame({
      seed: 'l33-06-label',
      playerCount: 2,
      difficulties: ['easy', 'easy'],
      policyIds: [HEURISTIC_V4_POLICY_ID, HEURISTIC_V4_POLICY_ID],
      captureFeatureSnapshots: true,
      onPolicyDecide: () => {
        decisions += 1;
      },
    });

    expect(row.featureSnapshots).toBeDefined();
    expect(row.featureSnapshots?.length).toBe(decisions);
    expect(decisions).toBeGreaterThan(0);

    for (const snapshot of row.featureSnapshots ?? []) {
      expect(snapshot.winnerPlayerId).toBe(row.winnerPlayerId);
      expect(snapshot.seed).toBe(row.seed);
      expect(snapshot.features.length).toBeGreaterThan(0);
    }
  });

  it('stalled games contribute zero snapshot rows', () => {
    let thrown: unknown;

    try {
      runSimulatedGame({
        seed: 'l33-06-stall',
        playerCount: 2,
        difficulties: ['hard', 'hard'],
        policyIds: [HEURISTIC_V4_POLICY_ID, HEURISTIC_V4_POLICY_ID],
        captureFeatureSnapshots: true,
        maxTurns: 1,
      });
    } catch (error) {
      thrown = error;
    }

    expect(isStallError(thrown)).toBe(true);
  });
});
