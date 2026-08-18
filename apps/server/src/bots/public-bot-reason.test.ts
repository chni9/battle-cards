/**
 * Public Why-panel reason guard — L36-04 / #V5-4.
 */

import { describe, expect, it } from 'vitest';

import { assertPublicBotReason } from './public-bot-reason';
import { searchV5Policy } from './policies/search-v5';
import { createInitialState } from '../engine/create-initial-state';
import { createRng } from '../engine/rng';
import { listLegalActions } from '../engine/turn/list-legal-actions';
import { buildPlayingViewFor } from '../protocol/build-view-for';

describe('public bot reason (L36-04)', () => {
  it('accepts coarse search codes without params', () => {
    expect(assertPublicBotReason({ code: 'search-best' })).toEqual({ code: 'search-best' });
    expect(assertPublicBotReason({ code: 'search-fallback' })).toEqual({
      code: 'search-fallback',
    });
  });

  it('rejects numeric and visit/eval params', () => {
    expect(() =>
      assertPublicBotReason({ code: 'search-best', params: { visits: '12' } }),
    ).toThrow(/#V5-4/);
    expect(() =>
      assertPublicBotReason({ code: 'search-best', params: { winProbability: '0.61' } }),
    ).toThrow(/#V5-4/);
    expect(() =>
      assertPublicBotReason({ code: 'search-best', params: { note: '0.5' } }),
    ).toThrow(/numeric/);
  });

  it('search-v5 success reason is search-best and keeps scores off the reason', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l36-04-reason',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    state.currentTurnPlayerId = 'a';
    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'R',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const actions = listLegalActions(state, 'a');
    const decision = searchV5Policy.decide(view, actions, createRng('l36-04'), {
      actionLog: [],
      budget: { kind: 'iterations', n: 4 },
    });

    expect(decision.reason).toEqual({ code: 'search-best' });
    expect(decision.reason.params).toBeUndefined();
    const diagnostics = decision.searchDiagnostics;
    expect(diagnostics).toBeDefined();

    if (diagnostics === undefined) {
      return;
    }

    expect(diagnostics.actionScores.length).toBeGreaterThan(0);
    expect(assertPublicBotReason(decision.reason).code).toBe('search-best');
  });
});
