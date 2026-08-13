/**
 * PUCT priors + progressive widening — L35-04.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../../engine/create-initial-state';
import { createRng } from '../../engine/rng';
import { listLegalActions } from '../../engine/turn/list-legal-actions';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { DEFAULT_POLICY_WEIGHTS } from '../policy-weights';
import {
  buildActionPriors,
  buildDecisionPriors,
  widenedPriorSlice,
} from './priors';
import { maxWidenedChildren } from './search-budget';

describe('search priors (L35-04)', () => {
  it('orders first expansions by heuristic prior, not uniform', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l35-04-prior',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    state.currentTurnPlayerId = 'a';
    const alice = state.players.find((player) => player.id === 'a');

    expect(alice).toBeDefined();

    if (alice === undefined) {
      return;
    }

    alice.points = 30;
    alice.hand = [
      { instanceId: 'atk', cardId: 'super-attack', isUpgraded: false },
      { instanceId: 'spy', cardId: 'spy', isUpgraded: false },
    ];

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const actions = listLegalActions(state, 'a');
    const rng = createRng('l35-04-prior');
    const priors = buildActionPriors(view, actions, rng, DEFAULT_POLICY_WEIGHTS);
    const uniform = buildActionPriors(view, actions, rng, DEFAULT_POLICY_WEIGHTS, {
      uniform: true,
    });

    expect(priors.length).toBe(actions.length);
    expect(priors[0]?.score ?? 0).toBeGreaterThanOrEqual(priors[1]?.score ?? 0);

    const priorMassTop = (priors[0]?.prior ?? 0) + (priors[1]?.prior ?? 0);
    const uniformMassTop = (uniform[0]?.prior ?? 0) + (uniform[1]?.prior ?? 0);
    // Softmax concentrates more mass on the top-2 than uniform on the same slots
    // when scores differ — compare max prior vs uniform 1/n.
    const maxPrior = Math.max(...priors.map((entry) => entry.prior));
    expect(maxPrior).toBeGreaterThan(1 / actions.length + 1e-9);
    void priorMassTop;
    void uniformMassTop;
  });

  it('progressive widening grows with visits', () => {
    expect(maxWidenedChildren(1)).toBe(1);
    expect(maxWidenedChildren(100)).toBe(10);

    const fake = Array.from({ length: 20 }, (_, index) => ({
      decision: { kind: 'action' as const, action: { type: 'draw' as const } },
      decisionKey: `k${String(index)}`,
      prior: 1 / 20,
      score: 20 - index,
    }));
    expect(widenedPriorSlice(fake, 1)).toHaveLength(1);
    expect(widenedPriorSlice(fake, 100).length).toBeGreaterThan(1);
  });

  it('sub-choice decisions get uniform priors', () => {
    const decisions = [
      { kind: 'special-pick' as const, cardId: 'suicide' as const },
      { kind: 'special-pick' as const, cardId: 'spy' as const },
    ];
    // spy is not a special — use real specials
    const real = [
      { kind: 'special-pick' as const, cardId: 'suicide' as const },
      { kind: 'special-pick' as const, cardId: 'cloning' as const },
    ];
    void decisions;
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l35-04-sub',
    });
    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const priors = buildDecisionPriors(
      real,
      view,
      createRng('l35-04-sub'),
      DEFAULT_POLICY_WEIGHTS,
    );
    expect(priors).toHaveLength(2);
    expect(priors[0]?.prior).toBeCloseTo(0.5);
    expect(priors[1]?.prior).toBeCloseTo(0.5);
  });
});
