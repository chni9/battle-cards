/**
 * Headless 4-bot game completion — technical spec v3 M9 / L16-06.
 *
 * Drives enumerate → decide → noise → performTurnAction (+ inline Mirror/reward)
 * without a Colyseus room. Proves the heuristic finishes games with no timeout default.
 */

import { describe, expect, it } from 'vitest';

import type { ActionLogEntryView, GameState } from '@card-battle/shared';

import { applyDifficultyNoise } from '../bots/difficulty-noise';
import { decide, pickEliminationRewards, pickMirrorRedirect } from '../bots/heuristic-policy';
import { createInitialState } from '../engine/create-initial-state';
import { createRng } from '../engine/rng';
import {
  findSoleSurvivorId,
  listAvailableRewardCards,
} from '../engine/turn/elimination-rewards';
import { listLegalActions } from '../engine/turn/list-legal-actions';
import {
  completeEliminationRewardChoice,
  completeMirrorChoice,
  performTurnAction,
  type TurnResult,
} from '../engine/turn/perform-action';
import { buildPlayingViewFor } from '../protocol/build-view-for';

const MAX_TURNS = 5_000;

function appendLog(log: ActionLogEntryView[], result: TurnResult, turnSequence: number): void {
  log.push({
    kind: 'actionPlayed',
    actorPlayerId: result.actionPlayed.actorPlayerId,
    action: result.actionPlayed.action,
    ...(result.actionPlayed.cardId !== undefined ? { cardId: result.actionPlayed.cardId } : {}),
    ...(result.actionPlayed.isUpgraded !== undefined
      ? { isUpgraded: result.actionPlayed.isUpgraded }
      : {}),
    ...(result.actionPlayed.targetPlayerId !== undefined
      ? { targetPlayerId: result.actionPlayed.targetPlayerId }
      : {}),
    ...(result.actionPlayed.attacks !== undefined
      ? { attacks: result.actionPlayed.attacks }
      : {}),
    turnSequence,
  });

  for (const resolved of result.resolved) {
    log.push({
      kind: 'actionResolved',
      effectId: resolved.effectId,
      sourcePlayerId: resolved.sourcePlayerId,
      targetPlayerId: resolved.targetPlayerId,
      cardId: resolved.cardId,
      isUpgraded: resolved.isUpgraded,
      livesLost: resolved.livesLost,
      shieldAbsorbed: resolved.shieldAbsorbed,
      outcome: resolved.outcome,
      turnSequence,
    });
  }
}

function playBotTurn(state: GameState, actionLog: ActionLogEntryView[]): void {
  const botId = state.currentTurnPlayerId;

  if (botId === null) {
    throw new Error('no current player');
  }

  const view = buildPlayingViewFor({
    recipientSessionId: botId,
    gameCode: 'SIM',
    state,
    turnDeadlineMs: null,
    actionLog,
  });
  const actions = listLegalActions(state, botId);
  const rng = createRng(`${state.seed}:bot:${botId}:${state.turnSequence}`);
  const top = decide(view, actions, rng);
  const chosen = applyDifficultyNoise(top, actions, 'hard', rng);
  let result = performTurnAction(state, botId, chosen);

  if (!result.ok) {
    result = performTurnAction(state, botId, { type: 'draw' });
  }

  if (!result.ok) {
    throw new Error(`bot ${botId} could not act: ${result.message}`);
  }

  appendLog(actionLog, result, state.turnSequence);

  while (result.mirrorChoicePending === true) {
    const mirrorView = buildPlayingViewFor({
      recipientSessionId: botId,
      gameCode: 'SIM',
      state,
      turnDeadlineMs: null,
      actionLog,
    });
    const pick = pickMirrorRedirect(
      mirrorView,
      createRng(`${state.seed}:bot:${botId}:mirror:${state.turnSequence}`),
    );

    if (pick === null) {
      throw new Error('Mirror pending but policy returned null');
    }

    result = completeMirrorChoice(state, botId, pick.pendingEffectId, pick.newTargetPlayerId);

    if (!result.ok) {
      throw new Error(`Mirror failed: ${result.message}`);
    }

    appendLog(actionLog, result, state.turnSequence);
  }

  while (result.rewardChoicePending === true) {
    const choice = state.rewardChoice;

    if (choice === null) {
      throw new Error('reward pending without rewardChoice');
    }

    const rewardView = buildPlayingViewFor({
      recipientSessionId: choice.eliminatorPlayerId,
      gameCode: 'SIM',
      state,
      turnDeadlineMs: null,
      actionLog,
    });
    const available = listAvailableRewardCards(state, choice.eliminatedPlayerId);
    const picks = pickEliminationRewards(
      rewardView,
      available,
      state.lifeLimit,
      createRng(
        `${state.seed}:bot:${choice.eliminatorPlayerId}:reward:${state.turnSequence}`,
      ),
    );
    const rewardResult = completeEliminationRewardChoice(
      state,
      choice.eliminatorPlayerId,
      choice.eliminationId,
      picks,
    );

    if (!rewardResult.ok) {
      throw new Error(`Reward failed: ${rewardResult.message}`);
    }

    result = {
      ok: true,
      actionPlayed: result.actionPlayed,
      resolved: [],
      winnerPlayerId: rewardResult.winnerPlayerId,
      eliminatedPlayerIds: [],
      eliminations: [],
      rewardChoicePending: rewardResult.rewardChoicePending,
    };
  }
}

describe('4-bot headless completion (L16-06)', () => {
  it('plays a 4-bot hard game to a sole survivor without throwing', () => {
    const state = createInitialState({
      seats: [
        { id: 'bot-1', nickname: 'Alpha' },
        { id: 'bot-2', nickname: 'Bravo' },
        { id: 'bot-3', nickname: 'Charlie' },
        { id: 'bot-4', nickname: 'Delta' },
      ],
      seed: 'four-bot-hard-complete',
    });
    const actionLog: ActionLogEntryView[] = [];
    let turns = 0;

    while (findSoleSurvivorId(state) === null && turns < MAX_TURNS) {
      playBotTurn(state, actionLog);
      turns += 1;
    }

    expect(turns).toBeLessThan(MAX_TURNS);
    expect(findSoleSurvivorId(state)).not.toBeNull();
    expect(state.mirrorChoice).toBeNull();
    expect(state.rewardChoice).toBeNull();
  });
});
