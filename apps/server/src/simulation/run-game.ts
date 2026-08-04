/**
 * One headless simulated game — technical spec v3 §8 (L18-04).
 */

import type {
  ActionLogEntryView,
  BotDifficulty,
  KitId,
} from '@card-battle/shared';

import { applyDifficultyNoise } from '../bots/difficulty-noise';
import {
  decide,
  pickEliminationRewards,
  pickMirrorRedirect,
} from '../bots/heuristic-policy';
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
import type { FinishedGameEliminationRecord } from '../db/finished-game-types';
import { buildFinishedGameSnapshot } from '../db/build-finished-game-snapshot';

/** Fixed clock for simulator reproducibility (L18-01). */
export const SIM_NOW_MS = 0;

const MAX_TURNS = 2_500;

export interface RunGameInput {
  seed: string;
  playerCount: number;
  difficulties: readonly BotDifficulty[];
  kitAssignment?: readonly KitId[];
  /** Override default 2500 — tests force MAX_TURNS without hunting stall seeds. */
  maxTurns?: number;
}

export interface SimulationGameRow {
  seed: string;
  seatCount: number;
  winnerPlayerId: string;
  turnSequence: number;
  players: readonly {
    playerId: string;
    seatIndex: number;
    /** Kit at deal time — Cloning can change `kitId` mid-game. */
    startingKitId: KitId;
    kitId: KitId;
    isWinner: boolean;
    isEliminated: boolean;
    lives: number;
    points: number;
    upgradePoints: number;
    shield: number;
    shieldIsUpgraded: boolean;
    cardsPlayedCount: number;
    cardsPlayedById: Readonly<Record<string, number>>;
    buyCount: number;
    sellCount: number;
    upgradeCount: number;
    isBot: true;
    botDifficulty: BotDifficulty;
  }[];
  eliminations: readonly FinishedGameEliminationRecord[];
}

function appendLog(log: ActionLogEntryView[], result: TurnResult): void {
  const turnSequence = result.actionPlayed.turnSequence;

  if (result.mirrorRedirect !== undefined) {
    log.push({
      kind: 'mirrorRedirected',
      actorPlayerId: result.mirrorRedirect.actorPlayerId,
      cardId: result.mirrorRedirect.cardId,
      previousTargetPlayerId: result.mirrorRedirect.previousTargetPlayerId,
      newTargetPlayerId: result.mirrorRedirect.newTargetPlayerId,
      turnSequence: result.mirrorRedirect.turnSequence,
    });
  } else {
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
  }

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

export function runSimulatedGame(input: RunGameInput): SimulationGameRow {
  const seats = Array.from({ length: input.playerCount }, (_, index) => ({
    id: `bot-${String(index)}`,
    nickname: `Bot${String(index)}`,
  }));

  const difficultiesById = new Map<string, BotDifficulty>();

  for (const [index, seat] of seats.entries()) {
    const difficulty = input.difficulties[index];

    if (difficulty === undefined) {
      throw new Error('difficulty missing for seat');
    }

    difficultiesById.set(seat.id, difficulty);
  }

  const state = createInitialState({
    seats,
    seed: input.seed,
    ...(input.kitAssignment !== undefined ? { kitAssignment: input.kitAssignment } : {}),
  });

  const startingKitByPlayerId = new Map(
    state.players.map((player) => [player.id, player.kitId] as const),
  );

  const actionLog: ActionLogEntryView[] = [];
  const eliminations: FinishedGameEliminationRecord[] = [];
  let turns = 0;

  const turnCap = input.maxTurns ?? MAX_TURNS;

  while (findSoleSurvivorId(state) === null && turns < turnCap) {
    const botId = state.currentTurnPlayerId;

    if (botId === null) {
      throw new Error('no current player mid-game');
    }

    const difficulty = difficultiesById.get(botId) ?? 'hard';
    const view = buildPlayingViewFor({
      recipientSessionId: botId,
      gameCode: `sim-${input.seed}`,
      state,
      turnDeadlineMs: null,
      actionLog,
      botDifficulties: difficultiesById,
    });
    const actions = listLegalActions(state, botId);
    const rng = createRng(`${state.seed}:bot:${botId}:${state.turnSequence}`);
    const top = decide(view, actions, rng);
    const chosen = applyDifficultyNoise(top, actions, difficulty, rng);

    const hooks = {
      resolveMirror: (
        s: typeof state,
        actorId: string,
      ): { pendingEffectId: string; newTargetPlayerId: string } => {
        const mirrorView = buildPlayingViewFor({
          recipientSessionId: actorId,
          gameCode: `sim-${input.seed}`,
          state: s,
          turnDeadlineMs: null,
          actionLog,
          botDifficulties: difficultiesById,
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
      resolveReward: (s: typeof state) => {
        const choice = s.rewardChoice;

        if (choice === null) {
          throw new Error('reward pending without rewardChoice');
        }

        const rewardView = buildPlayingViewFor({
          recipientSessionId: choice.eliminatorPlayerId,
          gameCode: `sim-${input.seed}`,
          state: s,
          turnDeadlineMs: null,
          actionLog,
          botDifficulties: difficultiesById,
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
      nowMs: SIM_NOW_MS,
      onTurnResult: (step) => {
        appendLog(actionLog, step);

        for (const event of step.eliminations) {
          eliminations.push({
            playerId: event.playerId,
            eliminatorPlayerId: event.eliminatorPlayerId,
            reason: 'combat',
          });
        }
      },
      onRewardResult: (reward) => {
        actionLog.push({
          kind: 'rewardsClaimed',
          eliminatorPlayerId: reward.rewardsClaimed.eliminatorPlayerId,
          eliminatedPlayerId: reward.rewardsClaimed.eliminatedPlayerId,
          turnSequence: state.turnSequence,
        });
      },
    });

    if (!result.ok) {
      result = performAndCompleteTurn(state, botId, { type: 'draw' }, hooks, {
        nowMs: SIM_NOW_MS,
        onTurnResult: (step) => {
          appendLog(actionLog, step);

          for (const event of step.eliminations) {
            eliminations.push({
              playerId: event.playerId,
              eliminatorPlayerId: event.eliminatorPlayerId,
              reason: 'combat',
            });
          }
        },
      });
    }

    if (!result.ok) {
      throw new Error(`sim bot ${botId} could not act: ${result.message}`);
    }

    turns += 1;
  }

  const winnerPlayerId = findSoleSurvivorId(state);

  if (winnerPlayerId === null) {
    throw new Error(`game ${input.seed} hit MAX_TURNS without a winner`);
  }

  const snapshot = buildFinishedGameSnapshot({
    roomId: `sim-${input.seed}`,
    startedAtMs: SIM_NOW_MS,
    endedAtMs: SIM_NOW_MS,
    winnerPlayerId,
    gameState: state,
    actionLog,
    eliminations,
    botDifficultiesByPlayerId: difficultiesById,
  });

  return {
    seed: snapshot.seed,
    seatCount: input.playerCount,
    winnerPlayerId: snapshot.winnerPlayerId,
    turnSequence: snapshot.turnSequence,
    players: snapshot.players.map((player) => {
      const botDifficulty = difficultiesById.get(player.playerId);

      if (botDifficulty === undefined) {
        throw new Error(`missing difficulty for ${player.playerId}`);
      }

      return {
        playerId: player.playerId,
        seatIndex: player.seatIndex,
        startingKitId: startingKitByPlayerId.get(player.playerId) ?? player.kitId,
        kitId: player.kitId,
        isWinner: player.isWinner,
        isEliminated: player.isEliminated,
        lives: player.lives,
        points: player.points,
        upgradePoints: player.upgradePoints,
        shield: player.shield,
        shieldIsUpgraded: player.shieldIsUpgraded,
        cardsPlayedCount: player.cardsPlayedCount,
        cardsPlayedById: player.cardsPlayedById,
        buyCount: player.buyCount,
        sellCount: player.sellCount,
        upgradeCount: player.upgradeCount,
        isBot: true as const,
        botDifficulty,
      };
    }),
    eliminations: snapshot.eliminations,
  };
}
