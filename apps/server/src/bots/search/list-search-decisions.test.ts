/**
 * Search decision nodes — L35-02.
 * Each SubChoiceKind is a search node; selection follows value estimates, not list order.
 */

import { describe, expect, it } from 'vitest';

import type { GameState, SubChoiceKind } from '@card-battle/shared';

import { createInitialState } from '../../engine/create-initial-state';
import { createRng } from '../../engine/rng';
import { beginStealChoice } from '../../engine/turn/steal-choice';
import { beginPoolPick, beginSpecialPick, beginReanimationKitPick } from '../../engine/turn/generic-sub-choice';
import { performTurnAction } from '../../engine/turn/perform-action';
import { queueEffect } from '../../engine/turn/queue-effect';
import { evaluate } from '../eval/evaluate';
import { cloneGameState } from './clone-state';
import { applySearchDecision } from './apply-search-decision';
import { searchDecisionKey } from './info-set-key';
import {
  listSearchDecisions,
  searchDecisionOwner,
} from './list-search-decisions';
import type { SearchDecision } from './search-types';

const SIM_NOW_MS = 0;

function livingIndex(state: GameState, playerId: string): number {
  return state.players.filter((player) => !player.isEliminated).findIndex((player) => player.id === playerId);
}

/** Argmax self win-prob after applying each decision on a clone. */
function selectBySelfValue(
  state: GameState,
  decisions: readonly SearchDecision[],
  ownerId: string,
): SearchDecision {
  const first = decisions[0];

  if (first === undefined) {
    throw new Error('empty decisions');
  }

  let best = first;
  let bestValue = Number.NEGATIVE_INFINITY;
  const rng = createRng('l35-02-select');

  for (const decision of decisions) {
    const clone = cloneGameState(state);
    const applied = applySearchDecision(clone, decision, rng, SIM_NOW_MS);

    if (!applied.ok) {
      continue;
    }

    const values = evaluate(clone, ownerId);
    const index = livingIndex(clone, ownerId);
    const value = values[index] ?? Number.NEGATIVE_INFINITY;

    if (value > bestValue) {
      bestValue = value;
      best = decision;
    }
  }

  return best;
}

function threeSeatState(seed: string): GameState {
  return createInitialState({
    seats: [
      { id: 'a', nickname: 'Alice' },
      { id: 'b', nickname: 'Bob' },
      { id: 'c', nickname: 'Carol' },
    ],
    seed,
  });
}

describe('listSearchDecisions / applySearchDecision (L35-02)', () => {
  it('lists main TurnActions when no sub-choice is active', () => {
    const state = threeSeatState('l35-02-actions');
    state.currentTurnPlayerId = 'a';
    const decisions = listSearchDecisions(state);

    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions.every((decision) => decision.kind === 'action')).toBe(true);
    expect(searchDecisionOwner(state)).toBe('a');
  });

  it('mirror: lists effect×target decisions and apply redirects', () => {
    const state = threeSeatState('l35-02-mirror');
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');

    expect(alice && bob && carol).toBeTruthy();

    if (alice === undefined || bob === undefined || carol === undefined) {
      return;
    }

    state.currentTurnPlayerId = 'a';
    alice.points = 10;
    alice.hand = [{ instanceId: 'atk-a', cardId: 'super-attack', isUpgraded: false }];
    performTurnAction(state, 'a', {
      type: 'playCard',
      instanceId: 'atk-a',
      targetPlayerId: 'c',
    });

    state.currentTurnPlayerId = 'b';
    bob.points = 10;
    bob.hand = [{ instanceId: 'atk-b', cardId: 'super-attack', isUpgraded: false }];
    performTurnAction(state, 'b', {
      type: 'playCard',
      instanceId: 'atk-b',
      targetPlayerId: 'c',
    });

    state.currentTurnPlayerId = 'c';
    carol.points = 6;
    carol.hand = [{ instanceId: 'm-1', cardId: 'mirror', isUpgraded: false }];
    performTurnAction(state, 'c', { type: 'playCard', instanceId: 'm-1' });

    expect(state.mirrorChoice).not.toBeNull();
    expect(searchDecisionOwner(state)).toBe('c');

    const decisions = listSearchDecisions(state);
    expect(decisions.every((decision) => decision.kind === 'mirror')).toBe(true);
    expect(decisions.length).toBeGreaterThan(1);

    const pick = decisions[0];
    expect(pick?.kind).toBe('mirror');

    if (pick?.kind !== 'mirror') {
      return;
    }

    const clone = cloneGameState(state);
    const result = applySearchDecision(
      clone,
      pick,
      createRng('l35-02-mirror-apply'),
      SIM_NOW_MS,
    );
    expect(result.ok).toBe(true);
    expect(clone.mirrorChoice).toBeNull();
  });

  it('steal-pick: lists eligible instances and apply clears the slot', () => {
    const state = threeSeatState('l35-02-steal');
    const bob = state.players.find((player) => player.id === 'b');

    expect(bob).toBeDefined();

    if (bob === undefined) {
      return;
    }

    state.currentTurnPlayerId = 'a';
    bob.hand = [
      { instanceId: 'a-junk', cardId: 'tax', isUpgraded: false },
      { instanceId: 'z-good', cardId: 'mega-attack', isUpgraded: false },
    ];
    bob.specialCards = [];

    beginStealChoice(state, {
      thiefPlayerId: 'a',
      victimPlayerId: 'b',
      pendingSpiedVictimIds: [],
      cardIsUpgraded: false,
      nowMs: SIM_NOW_MS,
    });

    const decisions = listSearchDecisions(state);
    expect(decisions).toEqual([
      { kind: 'steal-pick', instanceId: 'a-junk' },
      { kind: 'steal-pick', instanceId: 'z-good' },
    ]);

    const clone = cloneGameState(state);
    const result = applySearchDecision(
      clone,
      { kind: 'steal-pick', instanceId: 'z-good' },
      createRng('l35-02-steal-apply'),
      SIM_NOW_MS,
    );
    expect(result.ok).toBe(true);
    expect(clone.stealChoice).toBeNull();
  });

  it('special-pick: value-based selection prefers higher material special, not list order', () => {
    const state = threeSeatState('l35-02-special-value');
    state.currentTurnPlayerId = 'a';
    beginSpecialPick(state, { playerId: 'a', nowMs: SIM_NOW_MS });

    const decisions = listSearchDecisions(state).filter(
      (decision): decision is Extract<SearchDecision, { kind: 'special-pick' }> =>
        decision.kind === 'special-pick' &&
        (decision.cardId === 'suicide' || decision.cardId === 'super-regeneration'),
    );

    expect(decisions.length).toBe(2);
    // Lexicographic: suicide before super-regeneration — fixed-first would take suicide.
    expect(decisions[0]?.cardId).toBe('suicide');

    const forward = selectBySelfValue(state, decisions, 'a');
    const reversed = selectBySelfValue(state, [...decisions].reverse(), 'a');

    expect(searchDecisionKey(forward)).toBe(searchDecisionKey(reversed));
    expect(forward).toEqual({ kind: 'special-pick', cardId: 'super-regeneration' });
  });

  it('pool-pick / special-pick / reanimation-kit: list and apply', () => {
    const kinds: SubChoiceKind[] = ['pool-pick', 'special-pick', 'reanimation-kit'];

    for (const kind of kinds) {
      const state = threeSeatState(`l35-02-${kind}`);
      state.currentTurnPlayerId = 'a';
      const alice = state.players.find((player) => player.id === 'a');

      expect(alice, kind).toBeDefined();

      if (alice === undefined) {
        continue;
      }

      if (kind === 'pool-pick') {
        state.pool = [
          { instanceId: 'p1', cardId: 'basic-attack', isUpgraded: false },
          { instanceId: 'p2', cardId: 'basic-attack', isUpgraded: false },
          { instanceId: 'p3', cardId: 'super-attack', isUpgraded: false },
          { instanceId: 'p4', cardId: 'tax', isUpgraded: false },
          { instanceId: 'p5', cardId: 'mirror', isUpgraded: false },
        ];
        beginPoolPick(state, {
          playerId: 'a',
          cardIsUpgraded: true,
          nowMs: SIM_NOW_MS,
        });
      } else if (kind === 'special-pick') {
        beginSpecialPick(state, { playerId: 'a', nowMs: SIM_NOW_MS });
      } else {
        alice.pendingReanimation = { isUpgraded: true };
        beginReanimationKitPick(state, { playerId: 'a', nowMs: SIM_NOW_MS });
      }

      expect(searchDecisionOwner(state)).toBe('a');
      const decisions = listSearchDecisions(state);
      expect(decisions.length, kind).toBeGreaterThan(1);
      expect(
        decisions.every((decision) => decision.kind === kind),
        kind,
      ).toBe(true);

      const pick = decisions[0];
      expect(pick, kind).toBeDefined();

      if (pick === undefined) {
        continue;
      }

      const clone = cloneGameState(state);
      const result = applySearchDecision(
        clone,
        pick,
        createRng(`l35-02-apply-${kind}`),
        SIM_NOW_MS,
      );
      expect(result.ok, kind).toBe(true);
    }
  });

  it('elimination-reward: owner is eliminator; list includes reward pairs', () => {
    const state = threeSeatState('l35-02-reward');
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    expect(alice && bob).toBeTruthy();

    if (alice === undefined || bob === undefined) {
      return;
    }

    // Lethal pending attack from A → B resolves on B's turn after B draws.
    state.currentTurnPlayerId = 'a';
    alice.points = 10;
    queueEffect({
      state,
      sourcePlayerId: 'a',
      targetPlayerId: 'b',
      cardId: 'mega-attack',
      isUpgraded: false,
    });
    bob.lives = 1;
    bob.hand = [{ instanceId: 'loot', cardId: 'basic-attack', isUpgraded: false }];
    bob.specialCards = [];

    state.currentTurnPlayerId = 'b';
    const draw = performTurnAction(state, 'b', { type: 'draw' }, createRng('l35-02-reward-draw'), SIM_NOW_MS);

    expect(draw.ok && draw.rewardChoicePending === true).toBe(true);
    expect(state.rewardChoice).not.toBeNull();
    expect(searchDecisionOwner(state)).toBe('a');

    const decisions = listSearchDecisions(state);
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions.every((decision) => decision.kind === 'elimination-reward')).toBe(
      true,
    );

    const pick = decisions.find(
      (decision) =>
        decision.kind === 'elimination-reward' &&
        decision.choices[0].type === 'lives' &&
        decision.choices[1].type === 'points',
    );
    expect(pick).toBeDefined();

    if (pick === undefined) {
      return;
    }

    const clone = cloneGameState(state);
    const result = applySearchDecision(
      clone,
      pick,
      createRng('l35-02-reward-apply'),
      SIM_NOW_MS,
    );
    expect(result.ok).toBe(true);
  });
});
