/**
 * Room and simulator sequence a turn identically — technical spec v3 §10.3 (L18-03).
 */

import { describe, expect, it } from 'vitest';

import type { GameState, RewardChoice } from '@card-battle/shared';

import { createInitialState } from '../create-initial-state';
import {
  completeEliminationRewardChoice,
  completeMirrorChoice,
  performTurnAction,
  type TurnAction,
} from './perform-action';
import { performAndCompleteTurn, type TurnSubChoiceHooks } from './orchestrate-turn';

const FIXED_NOW_MS = 1_700_000_000_000;
const SEED = 'l18-03-equivalence';

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function scriptedHooks(
  mirrorPick: { pendingEffectId: string; newTargetPlayerId: string },
  rewardPicks: readonly [RewardChoice, RewardChoice],
): TurnSubChoiceHooks {
  return {
    resolveMirror: () => mirrorPick,
    resolveReward: (state) => {
      const choice = state.rewardChoice;

      if (choice === null) {
        throw new Error('expected rewardChoice');
      }

      return {
        chooserPlayerId: choice.eliminatorPlayerId,
        eliminationId: choice.eliminationId,
        choices: rewardPicks,
      };
    },
  };
}

/** Legacy room-style sequencing without the shared helper. */
function driveManually(
  state: GameState,
  actorId: string,
  action: TurnAction,
  hooks: TurnSubChoiceHooks,
): void {
  let result = performTurnAction(state, actorId, action, undefined, FIXED_NOW_MS);

  if (!result.ok) {
    throw new Error(result.message);
  }

  while (result.mirrorChoicePending === true) {
    const pick = hooks.resolveMirror(state, actorId);
    result = completeMirrorChoice(
      state,
      actorId,
      pick.pendingEffectId,
      pick.newTargetPlayerId,
      undefined,
      FIXED_NOW_MS,
    );

    if (!result.ok) {
      throw new Error(result.message);
    }
  }

  while (result.rewardChoicePending === true) {
    const pick = hooks.resolveReward(state);

    if (pick === null) {
      return;
    }

    const reward = completeEliminationRewardChoice(
      state,
      pick.chooserPlayerId,
      pick.eliminationId,
      pick.choices,
      FIXED_NOW_MS,
    );

    if (!reward.ok) {
      throw new Error(reward.message);
    }

    result = {
      ok: true,
      actionPlayed: result.actionPlayed,
      resolved: [],
      winnerPlayerId: reward.winnerPlayerId,
      eliminatedPlayerIds: [],
      eliminations: [],
      rewardChoicePending: reward.rewardChoicePending,
    };
  }
}

describe('orchestrate-turn equivalence (§10.3 / L18-03)', () => {
  it('scripted Mirror sequence yields identical GameState via helper vs manual drive', () => {
    const setup = (): GameState => {
      const state = createInitialState({
        seats: [
          { id: 'a', nickname: 'Alice' },
          { id: 'b', nickname: 'Bob' },
        ],
        seed: SEED,
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
      return state;
    };

    const viaHelper = setup();
    const pending = viaHelper.players.find((player) => player.id === 'b')?.pendingEffects[0];

    if (pending === undefined) {
      throw new Error('expected pending');
    }

    const hooks = scriptedHooks(
      { pendingEffectId: pending.id, newTargetPlayerId: 'a' },
      [{ type: 'lives' }, { type: 'lives' }],
    );

    const helperResult = performAndCompleteTurn(
      viaHelper,
      'b',
      { type: 'playCard', instanceId: 'm-1' },
      hooks,
      { nowMs: FIXED_NOW_MS },
    );

    expect(helperResult.ok).toBe(true);

    const viaManual = setup();
    const pendingManual = viaManual.players.find((player) => player.id === 'b')?.pendingEffects[0];

    if (pendingManual === undefined) {
      throw new Error('expected pending');
    }

    driveManually(
      viaManual,
      'b',
      { type: 'playCard', instanceId: 'm-1' },
      scriptedHooks(
        { pendingEffectId: pendingManual.id, newTargetPlayerId: 'a' },
        [{ type: 'lives' }, { type: 'lives' }],
      ),
    );

    expect(viaHelper).toEqual(viaManual);
  });

  it('two helper runs with the same seed and nowMs deep-equal', () => {
    const run = (): GameState => {
      const state = createInitialState({
        seats: [
          { id: 'a', nickname: 'Alice' },
          { id: 'b', nickname: 'Bob' },
        ],
        seed: `${SEED}-draw`,
      });
      const actor = state.currentTurnPlayerId;

      if (actor === null) {
        throw new Error('no actor');
      }

      const result = performAndCompleteTurn(
        state,
        actor,
        { type: 'draw' },
        scriptedHooks(
          { pendingEffectId: 'none', newTargetPlayerId: 'a' },
          [{ type: 'lives' }, { type: 'lives' }],
        ),
        { nowMs: FIXED_NOW_MS },
      );

      if (!result.ok) {
        throw new Error(result.message);
      }

      return cloneState(state);
    };

    expect(run()).toEqual(run());
  });

  it('resolveReward null leaves rewardChoice pending for the caller (human eliminator)', () => {
    const state = createInitialState({
      seats: [
        { id: 'human', nickname: 'Human' },
        { id: 'bot', nickname: 'Bot' },
      ],
      seed: `${SEED}-defer-reward`,
    });
    const human = state.players.find((player) => player.id === 'human');
    const bot = state.players.find((player) => player.id === 'bot');

    if (human === undefined || bot === undefined) {
      throw new Error('missing seats');
    }

    human.points = 1;
    human.hand = [{ instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false }];
    state.currentTurnPlayerId = 'human';
    performTurnAction(
      state,
      'human',
      { type: 'playCard', instanceId: 'atk-1', targetPlayerId: 'bot' },
      undefined,
      FIXED_NOW_MS,
    );

    bot.lives = 1;
    state.currentTurnPlayerId = 'bot';

    const result = performAndCompleteTurn(
      state,
      'bot',
      { type: 'draw' },
      {
        resolveMirror: () => {
          throw new Error('Mirror not expected');
        },
        resolveReward: () => null,
      },
      { nowMs: FIXED_NOW_MS },
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.rewardChoicePending).toBe(true);
    expect(result.winnerPlayerId).toBeNull();
    expect(state.rewardChoice?.eliminatorPlayerId).toBe('human');
    expect(bot.isEliminated).toBe(true);
  });
});
