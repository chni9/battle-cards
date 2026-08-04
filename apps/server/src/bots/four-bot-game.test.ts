/**
 * Headless 4-bot game completion — technical spec v3 M9 / L16-06.
 *
 * Drives enumerate → decide → noise → performAndCompleteTurn without a Colyseus room.
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
import { performAndCompleteTurn } from '../engine/turn/orchestrate-turn';
import type { TurnResult } from '../engine/turn/perform-action';
import { buildPlayingViewFor } from '../protocol/build-view-for';

const MAX_TURNS = 5_000;
const FIXED_NOW_MS = 0;

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

  const hooks = {
    resolveMirror: (s: GameState, actorId: string) => {
      const mirrorView = buildPlayingViewFor({
        recipientSessionId: actorId,
        gameCode: 'SIM',
        state: s,
        turnDeadlineMs: null,
        actionLog,
      });
      const pick = pickMirrorRedirect(
        mirrorView,
        createRng(`${s.seed}:bot:${actorId}:mirror:${s.turnSequence}`),
        s.mirrorChoice?.eligibleEffectIds,
      );

      if (pick === null) {
        throw new Error('Mirror pending but policy returned null');
      }

      return pick;
    },
    resolveReward: (s: GameState) => {
      const choice = s.rewardChoice;

      if (choice === null) {
        throw new Error('reward pending without rewardChoice');
      }

      const rewardView = buildPlayingViewFor({
        recipientSessionId: choice.eliminatorPlayerId,
        gameCode: 'SIM',
        state: s,
        turnDeadlineMs: null,
        actionLog,
      });
      const available = listAvailableRewardCards(s, choice.eliminatedPlayerId);
      const picks = pickEliminationRewards(
        rewardView,
        available,
        s.lifeLimit,
        createRng(
          `${s.seed}:bot:${choice.eliminatorPlayerId}:reward:${s.turnSequence}`,
        ),
      );

      return {
        chooserPlayerId: choice.eliminatorPlayerId,
        eliminationId: choice.eliminationId,
        choices: picks,
      };
    },
  };

  let result = performAndCompleteTurn(state, botId, chosen, hooks, {
    nowMs: FIXED_NOW_MS,
    onTurnResult: (step) => {
      appendLog(actionLog, step, state.turnSequence);
    },
  });

  if (!result.ok) {
    result = performAndCompleteTurn(state, botId, { type: 'draw' }, hooks, {
      nowMs: FIXED_NOW_MS,
      onTurnResult: (step) => {
        appendLog(actionLog, step, state.turnSequence);
      },
    });
  }

  if (!result.ok) {
    throw new Error(`bot ${botId} could not act: ${result.message}`);
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

    expect(findSoleSurvivorId(state)).not.toBeNull();
    expect(state.mirrorChoice).toBeNull();
    expect(state.rewardChoice).toBeNull();
  });
});
