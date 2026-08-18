/**
 * Lot 36-01 — room think envelope helpers, search-v5 sim wiring, 4-bot completion.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../engine/create-initial-state';
import { createRng } from '../engine/rng';
import { listLegalActions } from '../engine/turn/list-legal-actions';
import { buildPlayingViewFor } from '../protocol/build-view-for';
import { runSimulatedGame } from '../simulation/run-game';
import { roomBotPolicyId, roomSearchBudgetMs } from './bot-driver';
import { HEURISTIC_V4_POLICY_ID } from './policies/heuristic-v4';
import { SEARCH_V5_POLICY_ID, searchV5Policy } from './policies/search-v5';
import { SEARCH_V5_ENGAGE_POLICY_ID } from './policies/search-v5-engage';

describe('room search wiring (L36-01)', () => {
  it('maps difficulty to policy and wall-clock budget', () => {
    expect(roomBotPolicyId('easy')).toBe(HEURISTIC_V4_POLICY_ID);
    expect(roomBotPolicyId('normal')).toBe(SEARCH_V5_ENGAGE_POLICY_ID);
    expect(roomBotPolicyId('hard')).toBe(SEARCH_V5_ENGAGE_POLICY_ID);
    expect(roomSearchBudgetMs(900, 'hard')).toBe(850);
    expect(roomSearchBudgetMs(900, 'normal')).toBe(106);
    expect(roomSearchBudgetMs(900, 'easy')).toBe(850);
  });

  it('iteration-budget search decides identically for the same seed', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l36-01-decide-det',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    state.currentTurnPlayerId = 'a';
    const alice = state.players.find((player) => player.id === 'a');

    if (alice === undefined) {
      throw new Error('missing alice');
    }

    alice.points = 25;
    alice.hand = [
      { instanceId: 'atk', cardId: 'super-attack', isUpgraded: false },
      { instanceId: 'tax', cardId: 'tax', isUpgraded: false },
    ];

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'DET',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const actions = listLegalActions(state, 'a');
    const ctx = {
      actionLog: [] as const,
      budget: { kind: 'iterations' as const, n: 16 },
    };
    const first = searchV5Policy.decide(view, actions, createRng('l36-01-decide'), ctx);
    const second = searchV5Policy.decide(view, actions, createRng('l36-01-decide'), ctx);

    expect(first.action).toEqual(second.action);
    expect(first.searchDiagnostics?.iterations).toBe(16);
    expect(first.searchDiagnostics?.actionScores).toEqual(
      second.searchDiagnostics?.actionScores,
    );
  });

  it('four search-v5 bots complete without hitting MAX_TURNS', () => {
    const result = runSimulatedGame({
      seed: 'l36-01-four-search',
      playerCount: 4,
      difficulties: ['hard', 'hard', 'hard', 'hard'],
      kitAssignment: ['assassin', 'kamikaze', 'untouchable', 'prophet'],
      policyIds: [
        SEARCH_V5_POLICY_ID,
        SEARCH_V5_POLICY_ID,
        SEARCH_V5_POLICY_ID,
        SEARCH_V5_POLICY_ID,
      ],
      searchIterations: 2,
      maxTurns: 400,
    });

    expect(result.winnerPlayerId).toMatch(/^bot-/);
    expect(result.turnSequence).toBeGreaterThan(0);
    expect(result.turnSequence).toBeLessThanOrEqual(400);
  });
});
