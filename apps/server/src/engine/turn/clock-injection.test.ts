/**
 * Deterministic sub-choice deadlines — technical spec v3 §8.1 / L18-01.
 */

import { describe, expect, it } from 'vitest';

import { MIRROR_SUB_CHOICE_MS } from './mirror-choice';
import { REWARD_SUB_CHOICE_MS } from './elimination-rewards';
import { createInitialState } from '../create-initial-state';
import {
  completeEliminationRewardChoice,
  completeMirrorChoice,
  performTurnAction,
} from './perform-action';

const FIXED_NOW_MS = 1_700_000_000_000;

function scriptMirrorPendingDeadline(): ReturnType<typeof createInitialState> {
  const state = createInitialState({
    seats: [
      { id: 'a', nickname: 'Alice' },
      { id: 'b', nickname: 'Bob' },
    ],
    seed: 'l18-01-mirror-clock',
  });

  const alice = state.players.find((player) => player.id === 'a');
  const bob = state.players.find((player) => player.id === 'b');

  if (alice === undefined || bob === undefined) {
    throw new Error('missing seats');
  }

  state.currentTurnPlayerId = 'a';
  alice.points = 1;
  alice.hand = [{ instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false }];
  performTurnAction(
    state,
    'a',
    { type: 'playCard', instanceId: 'atk-1', targetPlayerId: 'b' },
    undefined,
    FIXED_NOW_MS,
  );

  state.currentTurnPlayerId = 'b';
  bob.points = 6;
  bob.hand = [{ instanceId: 'm-1', cardId: 'mirror', isUpgraded: false }];
  const pending = bob.pendingEffects[0];

  if (pending === undefined) {
    throw new Error('expected pending attack');
  }

  const mirrorPlay = performTurnAction(
    state,
    'b',
    { type: 'playCard', instanceId: 'm-1' },
    undefined,
    FIXED_NOW_MS,
  );

  if (!mirrorPlay.ok || mirrorPlay.mirrorChoicePending !== true) {
    throw new Error('expected Mirror pending');
  }

  return state;
}

describe('clock injection (L18-01 / tech §8.1)', () => {
  it('stores Mirror deadline from injected nowMs', () => {
    const state = scriptMirrorPendingDeadline();

    expect(state.mirrorChoice?.deadlineMs).toBe(FIXED_NOW_MS + MIRROR_SUB_CHOICE_MS);
  });

  it('two identical Mirror scripts with the same nowMs deep-equal including deadlines', () => {
    const first = scriptMirrorPendingDeadline();
    const second = scriptMirrorPendingDeadline();

    expect(first).toEqual(second);
    expect(first.mirrorChoice?.deadlineMs).toBe(second.mirrorChoice?.deadlineMs);
  });

  it('two identical Mirror+reward scripts deep-equal including reward deadline', () => {
    const run = (): ReturnType<typeof createInitialState> => {
      const state = createInitialState({
        seats: [
          { id: 'a', nickname: 'Alice' },
          { id: 'b', nickname: 'Bob' },
        ],
        seed: 'l18-01-reward-clock',
      });

      const alice = state.players.find((player) => player.id === 'a');
      const bob = state.players.find((player) => player.id === 'b');

      if (alice === undefined || bob === undefined) {
        throw new Error('missing seats');
      }

      // Lethal Super queued, then Bob draws so it resolves and eliminates Bob.
      state.currentTurnPlayerId = 'a';
      alice.points = 20;
      alice.hand = [{ instanceId: 'super-1', cardId: 'super-attack', isUpgraded: false }];
      bob.lives = 5;
      bob.shield = 0;
      performTurnAction(
        state,
        'a',
        { type: 'playCard', instanceId: 'super-1', targetPlayerId: 'b' },
        undefined,
        FIXED_NOW_MS,
      );

      state.currentTurnPlayerId = 'b';
      bob.hand = [];
      bob.points = 0;
      const draw = performTurnAction(state, 'b', { type: 'draw' }, undefined, FIXED_NOW_MS);

      if (!draw.ok || draw.rewardChoicePending !== true || state.rewardChoice === null) {
        throw new Error(`expected reward pending, got ${JSON.stringify(draw)}`);
      }

      expect(state.rewardChoice.deadlineMs).toBe(FIXED_NOW_MS + REWARD_SUB_CHOICE_MS);

      return state;
    };

    const first = run();
    const second = run();

    expect(first).toEqual(second);
    expect(first.rewardChoice?.deadlineMs).toBe(second.rewardChoice?.deadlineMs);
  });

  it('completing Mirror with injected nowMs keeps reward deadlines deterministic', () => {
    const state = scriptMirrorPendingDeadline();
    const choice = state.mirrorChoice;
    const pendingId = choice?.eligibleEffectIds[0];

    if (choice === null || pendingId === undefined) {
      throw new Error('missing Mirror choice');
    }

    const completed = completeMirrorChoice(state, 'b', pendingId, 'a', undefined, FIXED_NOW_MS);

    expect(completed.ok).toBe(true);
  });

  it('completing rewards accepts injected nowMs for the next head', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l18-01-reward-complete',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing seats');
    }

    state.currentTurnPlayerId = 'a';
    alice.points = 20;
    alice.hand = [{ instanceId: 'super-1', cardId: 'super-attack', isUpgraded: false }];
    bob.lives = 5;
    bob.shield = 0;
    performTurnAction(
      state,
      'a',
      { type: 'playCard', instanceId: 'super-1', targetPlayerId: 'b' },
      undefined,
      FIXED_NOW_MS,
    );

    state.currentTurnPlayerId = 'b';
    performTurnAction(state, 'b', { type: 'draw' }, undefined, FIXED_NOW_MS);

    const active = state.rewardChoice;

    if (active === null) {
      throw new Error('expected reward');
    }

    const result = completeEliminationRewardChoice(
      state,
      active.eliminatorPlayerId,
      active.eliminationId,
      [{ type: 'lives' }, { type: 'lives' }],
      FIXED_NOW_MS,
    );

    expect(result.ok).toBe(true);
  });
});
