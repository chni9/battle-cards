/**
 * One-round re-rank smoke — L33-05.
 * Proves decide returns a legal action and can diverge from pure greedy.
 */

import { describe, expect, it } from 'vitest';

import { createRng } from '../../engine/rng';
import { createInitialState } from '../../engine/create-initial-state';
import { listLegalActions } from '../../engine/turn/list-legal-actions';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { DEFAULT_POLICY_WEIGHTS } from '../policy-weights';
import { decideWithReason } from '../heuristic-policy';
import { heuristicTunedV5Policy } from './heuristic-tuned-v5';
import { decideWithOnePlyRerank } from './one-ply-rerank';

describe('one-round Phase A re-rank (L33-05)', () => {
  it('returns a legal action from a live 2p view', () => {
    const state = createInitialState({
      seats: [
        { id: 'bot-0', nickname: 'A' },
        { id: 'bot-1', nickname: 'B' },
      ],
      seed: 'l33-05-1round-smoke',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    const actorId = state.currentTurnPlayerId;

    if (actorId === null) {
      throw new Error('expected a current player');
    }

    const view = buildPlayingViewFor({
      recipientSessionId: actorId,
      gameCode: 'SMOKE',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const actions = listLegalActions(state, actorId);
    expect(actions.length).toBeGreaterThan(0);

    const decision = decideWithOnePlyRerank(
      view,
      actions,
      createRng('l33-05-1round-decide'),
      DEFAULT_POLICY_WEIGHTS,
      heuristicTunedV5Policy,
      [],
    );

    expect(actions).toContainEqual(decision.action);
  });

  it('matches greedy when only one legal action', () => {
    const state = createInitialState({
      seats: [
        { id: 'bot-0', nickname: 'A' },
        { id: 'bot-1', nickname: 'B' },
      ],
      seed: 'l33-05-1round-single',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    const actorId = state.currentTurnPlayerId;

    if (actorId === null) {
      throw new Error('expected a current player');
    }

    const view = buildPlayingViewFor({
      recipientSessionId: actorId,
      gameCode: 'SMOKE',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const all = listLegalActions(state, actorId);
    const only = all.slice(0, 1);
    expect(only).toHaveLength(1);

    const rerank = decideWithOnePlyRerank(
      view,
      only,
      createRng('single'),
      DEFAULT_POLICY_WEIGHTS,
      heuristicTunedV5Policy,
      [],
    );
    const greedy = decideWithReason(view, only, createRng('single'), DEFAULT_POLICY_WEIGHTS);

    expect(rerank.action).toEqual(greedy.action);
  });
});
