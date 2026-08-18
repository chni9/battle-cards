/**
 * Engage search wiring — backlog L40-03.
 * L35-03 “let them fight” stays on `search-v5` / max^n (`max-n-fight.test.ts`).
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../../engine/create-initial-state';
import { createRng } from '../../engine/rng';
import { listLegalActions } from '../../engine/turn/list-legal-actions';
import { queueEffect } from '../../engine/turn/queue-effect';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { grantSpy } from '../../protocol/visibility-matrix';
import { roomBotPolicyId } from '../bot-driver';
import { HEURISTIC_V4_POLICY_ID } from './heuristic-v4';
import { DEFAULT_POLICY_WEIGHTS } from '../policy-weights';
import { scoreEngageActions } from '../score-engage/score-actions';
import { SEARCH_V5_POLICY_ID, searchV5Policy, usesOfflineSearchBudget } from './search-v5';
import {
  SEARCH_V5_ENGAGE_POLICY_ID,
  searchV5EngagePolicy,
} from './search-v5-engage';
import { buildActionPriors } from '../search/priors';
import { getPolicy } from '../registry';

function finishableSpyState() {
  const state = createInitialState({
    seats: [
      { id: 'a', nickname: 'A' },
      { id: 'b', nickname: 'B' },
    ],
    seed: 'l40-03-finish',
    kitAssignment: ['assassin', 'kamikaze'],
  });
  const alice = state.players.find((player) => player.id === 'a');
  const bob = state.players.find((player) => player.id === 'b');

  if (alice === undefined || bob === undefined) {
    throw new Error('missing seats');
  }

  alice.lives = 12;
  alice.points = 20;
  alice.upgradePoints = 0;
  alice.hand = [
    { instanceId: 'super-1', cardId: 'super-attack', isUpgraded: false },
    { instanceId: 'tax-1', cardId: 'tax', isUpgraded: false },
  ];
  bob.lives = 3;
  grantSpy(state, 'a', 'b', 'full-resources');
  state.currentTurnPlayerId = 'a';
  return state;
}

describe('search-v5-engage (L40-03)', () => {
  it('rooms use search-v5-engage on Normal/Hard (L40-06 playtest)', () => {
    expect(roomBotPolicyId('easy')).toBe(HEURISTIC_V4_POLICY_ID);
    expect(roomBotPolicyId('normal')).toBe(SEARCH_V5_ENGAGE_POLICY_ID);
    expect(roomBotPolicyId('hard')).toBe(SEARCH_V5_ENGAGE_POLICY_ID);
    expect(getPolicy(SEARCH_V5_ENGAGE_POLICY_ID).id).toBe(SEARCH_V5_ENGAGE_POLICY_ID);
    expect(usesOfflineSearchBudget(SEARCH_V5_ENGAGE_POLICY_ID)).toBe(true);
    expect(usesOfflineSearchBudget(SEARCH_V5_POLICY_ID)).toBe(true);
    expect(usesOfflineSearchBudget(HEURISTIC_V4_POLICY_ID)).toBe(false);
  });

  it('does not sell the only Super to fund Spy at the root', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l40-06-spy-sell',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    const alice = state.players.find((player) => player.id === 'a');

    if (alice === undefined) {
      throw new Error('missing alice');
    }

    alice.points = 0;
    alice.hand = [
      { instanceId: 'super-1', cardId: 'super-attack', isUpgraded: false },
      { instanceId: 'strong-1', cardId: 'strong-attack', isUpgraded: false },
      { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
    ];
    state.currentTurnPlayerId = 'a';

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const legal = listLegalActions(state, 'a');
    const decision = searchV5EngagePolicy.decide(view, legal, createRng('l40-06-spy-sell'), {
      actionLog: [],
      budget: { kind: 'iterations', n: 16 },
    });

    expect(decision.action).not.toEqual({
      type: 'sellCard',
      instanceId: 'super-1',
    });
  });

  it('root priors use the engage scorer, not v4', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l40-03-scorer',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    const alice = state.players.find((player) => player.id === 'a');

    if (alice === undefined) {
      throw new Error('missing alice');
    }

    alice.points = 20;
    alice.upgradePoints = 2;
    alice.hand = [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }];
    state.currentTurnPlayerId = 'a';

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const legal = listLegalActions(state, 'a');
    const rng = createRng('l40-03-priors');
    const v4 = buildActionPriors(view, legal, rng, DEFAULT_POLICY_WEIGHTS);
    const engage = buildActionPriors(view, legal, rng, DEFAULT_POLICY_WEIGHTS, {
      scoreActions: scoreEngageActions,
    });

    const buyKey = (entry: (typeof v4)[number]): boolean =>
      entry.decision.kind === 'action' && entry.decision.action.type === 'buyUpgradePoint';
    const v4Buy = v4.find(buyKey);
    const engageBuy = engage.find(buyKey);

    expect(v4Buy).toBeDefined();
    expect(engageBuy).toBeDefined();
    expect(v4Buy?.score).toBeGreaterThan(0);
    expect(engageBuy?.score).toBe(Number.NEGATIVE_INFINITY);
  });

  it('attacks a finishable weaker seat instead of Tax', () => {
    const state = finishableSpyState();
    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const legal = listLegalActions(state, 'a');
    const decision = searchV5EngagePolicy.decide(view, legal, createRng('l40-03-finish'), {
      actionLog: [],
      budget: { kind: 'iterations', n: 16 },
    });

    expect(decision.action).toEqual({
      type: 'playCard',
      instanceId: 'super-1',
      targetPlayerId: 'b',
    });
    expect(state).toEqual(finishableSpyState());
  });

  it('agros the seat attacking you over a healthy bystander', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'l40-03-agro',
      kitAssignment: ['assassin', 'kamikaze', 'wizard'],
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');

    if (alice === undefined || bob === undefined || carol === undefined) {
      throw new Error('missing seats');
    }

    alice.lives = 12;
    alice.points = 20;
    alice.hand = [{ instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false }];
    bob.lives = 15;
    carol.lives = 15;
    grantSpy(state, 'a', 'b', 'full-resources');
    grantSpy(state, 'a', 'c', 'full-resources');
    queueEffect({
      state,
      sourcePlayerId: 'c',
      targetPlayerId: 'a',
      cardId: 'super-attack',
      isUpgraded: true,
    });
    state.currentTurnPlayerId = 'a';

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const legal = listLegalActions(state, 'a');
    const decision = searchV5EngagePolicy.decide(view, legal, createRng('l40-03-agro'), {
      actionLog: [],
      budget: { kind: 'iterations', n: 16 },
    });

    expect(decision.action).toEqual({
      type: 'playCard',
      instanceId: 'basic-1',
      targetPlayerId: 'c',
    });
    expect(searchV5Policy.id).toBe(SEARCH_V5_POLICY_ID);
  });
});
