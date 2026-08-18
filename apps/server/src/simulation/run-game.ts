/**
 * One headless simulated game — technical spec v3 §8 (L18-04).
 */

import type {
  ActionLogEntryView,
  BotDifficulty,
  GameState,
  KitId,
  PlayingStateView,
} from '@card-battle/shared';

import { applyDifficultyNoise } from '../bots/difficulty-noise';
import { usesOfflineSearchBudget } from '../bots/policies/search-v5';
import {
  DEFAULT_POLICY_ID,
  getPolicy,
} from '../bots/registry';
import type { BotPolicy } from '../bots/policy-types';
import { OFFLINE_SEARCH_ITERATIONS } from '../bots/search/search-budget';
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
import {
  captureFeatureSnapshot,
  labelFeatureSnapshots,
  type FeatureSnapshotRow,
  type UnlabeledFeatureSnapshot,
} from './feature-snapshots';

/** Fixed clock for simulator reproducibility (L18-01). */
export const SIM_NOW_MS = 0;

const MAX_TURNS = 2_500;

export interface PolicyDecideTelemetry {
  policyId: string;
  seatIndex: number;
  /** Offline iteration count — 1 for synchronous policies (technical spec v5 §8.2). */
  iterations: number;
}

export interface RunGameInput {
  seed: string;
  playerCount: number;
  difficulties: readonly BotDifficulty[];
  kitAssignment?: readonly KitId[];
  /** Override default 2500 — tests force MAX_TURNS without hunting stall seeds. */
  maxTurns?: number;
  /**
   * Per-seat policy ids (L32-02). Length must match `playerCount` when set.
   * Defaults to `heuristic-v4` for every seat.
   */
  policyIds?: readonly string[];
  /**
   * Per-seat policy instances (L33-03 optimizer). When set, length must match
   * `playerCount` and takes precedence over `policyIds`.
   */
  seatPolicies?: readonly BotPolicy[];
  /**
   * Optional checked-in weights profile id applied to every seat's decide ctx (L33-01).
   * `null` / omitted → each policy's closed-over weights.
   */
  weightsProfile?: string | null;
  /**
   * Iteration budget for ISMCTS seats (`search-v5*`, L36-01 / L40-03). Never wall-clock in the
   * simulator — reproducibility DoD. Defaults to `OFFLINE_SEARCH_ITERATIONS`.
   */
  searchIterations?: number;
  /** When true, attach labeled feature snapshots on a completed game (L33-06). */
  captureFeatureSnapshots?: boolean;
  /** Arena instrumentation — called after each synchronous policy decision (L32-06). */
  onPolicyDecide?: (telemetry: PolicyDecideTelemetry) => void;
  /**
   * Ground-truth hook before each decision (L34-06 calibration). The callback
   * may read `state`; belief APIs must still never take `GameState`.
   */
  onBeforeDecide?: (ctx: {
    state: GameState;
    view: PlayingStateView;
    actionLog: readonly ActionLogEntryView[];
    actingPlayerId: string;
  }) => void;
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
    /** `{ type: 'draw' }` actions — Lot 31 Tactician idle measurement. */
    drawCount: number;
    buyCount: number;
    sellCount: number;
    upgradeCount: number;
    isBot: true;
    botDifficulty: BotDifficulty;
  }[];
  eliminations: readonly FinishedGameEliminationRecord[];
  /** Present only when `captureFeatureSnapshots` was set and the game finished. */
  featureSnapshots?: readonly FeatureSnapshotRow[];
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

  if (result.mirrorRedirects !== undefined) {
    for (const redirect of result.mirrorRedirects) {
      log.push({
        kind: 'mirrorRedirected',
        actorPlayerId: redirect.actorPlayerId,
        cardId: redirect.cardId,
        previousTargetPlayerId: redirect.previousTargetPlayerId,
        newTargetPlayerId: redirect.newTargetPlayerId,
        turnSequence: redirect.turnSequence,
      });
    }
  }

  if (result.playerReanimated !== undefined) {
    for (const entry of result.playerReanimated) {
      log.push({
        kind: 'playerReanimated',
        playerId: entry.playerId,
        kitId: entry.kitId,
        turnSequence,
      });
    }
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

  if (result.curseTransfers !== undefined) {
    for (const transfer of result.curseTransfers) {
      log.push({
        kind: 'curseTransferred',
        fromPlayerId: transfer.fromPlayerId,
        toPlayerId: transfer.toPlayerId,
        cardId: 'curse',
        isUpgraded: transfer.isUpgraded,
        effectId: transfer.effectId,
        turnSequence: transfer.turnSequence,
      });
    }
  }
}

export function runSimulatedGame(input: RunGameInput): SimulationGameRow {
  const seats = Array.from({ length: input.playerCount }, (_, index) => ({
    id: `bot-${String(index)}`,
    nickname: `Bot${String(index)}`,
  }));

  if (
    input.policyIds !== undefined &&
    input.policyIds.length !== input.playerCount
  ) {
    throw new Error(
      `policyIds length ${String(input.policyIds.length)} !== playerCount ${String(input.playerCount)}`,
    );
  }

  if (
    input.seatPolicies !== undefined &&
    input.seatPolicies.length !== input.playerCount
  ) {
    throw new Error(
      `seatPolicies length ${String(input.seatPolicies.length)} !== playerCount ${String(input.playerCount)}`,
    );
  }

  const difficultiesById = new Map<string, BotDifficulty>();
  const policyByPlayerId = new Map<string, BotPolicy>();

  for (const [index, seat] of seats.entries()) {
    const difficulty = input.difficulties[index];

    if (difficulty === undefined) {
      throw new Error('difficulty missing for seat');
    }

    difficultiesById.set(seat.id, difficulty);
    const override = input.seatPolicies?.[index];
    const policy =
      override ?? getPolicy(input.policyIds?.[index] ?? DEFAULT_POLICY_ID);
    policyByPlayerId.set(seat.id, policy);
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
  const unlabeledSnapshots: UnlabeledFeatureSnapshot[] = [];
  let turns = 0;

  const turnCap = input.maxTurns ?? MAX_TURNS;

  while (findSoleSurvivorId(state) === null && turns < turnCap) {
    const botId = state.currentTurnPlayerId;

    if (botId === null) {
      throw new Error('no current player mid-game');
    }

    const difficulty = difficultiesById.get(botId) ?? 'hard';
    const policy = policyByPlayerId.get(botId);

    if (policy === undefined) {
      throw new Error(`no policy for seat ${botId}`);
    }

    const view = buildPlayingViewFor({
      recipientSessionId: botId,
      gameCode: `sim-${input.seed}`,
      state,
      turnDeadlineMs: null,
      actionLog,
      botDifficulties: difficultiesById,
    });
    input.onBeforeDecide?.({
      state,
      view,
      actionLog,
      actingPlayerId: botId,
    });
    const actions = listLegalActions(state, botId);
    const rng = createRng(`${state.seed}:bot:${botId}:${state.turnSequence}`);
    const searchIterations = input.searchIterations ?? OFFLINE_SEARCH_ITERATIONS;
    const decision = policy.decide(view, actions, rng, {
      actionLog,
      weightsProfile: input.weightsProfile ?? null,
      ...(usesOfflineSearchBudget(policy.id)
        ? { budget: { kind: 'iterations' as const, n: searchIterations } }
        : {}),
    });

    if (input.captureFeatureSnapshots === true) {
      unlabeledSnapshots.push(
        captureFeatureSnapshot(state, botId, actionLog, `sim-${input.seed}`),
      );
    }

    const seatIndex = Number.parseInt(botId.replace('bot-', ''), 10);

    input.onPolicyDecide?.({
      policyId: policy.id,
      seatIndex: Number.isFinite(seatIndex) ? seatIndex : 0,
      iterations: decision.searchDiagnostics?.iterations ?? 1,
    });
    const chosen = applyDifficultyNoise(decision.action, actions, difficulty, rng);

    const hooks = {
      resolveMirror: (
        s: typeof state,
        actorId: string,
      ): { pendingEffectId: string; newTargetPlayerId: string } => {
        const actorPolicy = policyByPlayerId.get(actorId);

        if (actorPolicy === undefined) {
          throw new Error(`no policy for seat ${actorId}`);
        }

        const mirrorView = buildPlayingViewFor({
          recipientSessionId: actorId,
          gameCode: `sim-${input.seed}`,
          state: s,
          turnDeadlineMs: null,
          actionLog,
          botDifficulties: difficultiesById,
        });
        const pick = actorPolicy.pickMirrorRedirect(
          mirrorView,
          createRng(`${s.seed}:bot:${actorId}:mirror:${s.turnSequence}`),
          s.mirrorChoice?.eligibleEffectIds,
        );

        if (pick === null) {
          throw new Error('Mirror pending but policy returned null');
        }

        return pick;
      },
      resolveSteal: (s: typeof state, actorId: string) => {
        const choice = s.stealChoice;
        const actorPolicy = policyByPlayerId.get(actorId);

        if (actorPolicy === undefined) {
          throw new Error(`no policy for seat ${actorId}`);
        }

        if (choice?.playerId !== actorId) {
          throw new Error('steal pending without stealChoice');
        }

        if (choice.eligibleInstanceIds.length === 0) {
          throw new Error('Steal pending but no eligible cards');
        }

        const stealView = buildPlayingViewFor({
          recipientSessionId: actorId,
          gameCode: `sim-${input.seed}`,
          state: s,
          turnDeadlineMs: null,
          actionLog,
          botDifficulties: difficultiesById,
        });

        return {
          instanceId: actorPolicy.pickStealInstanceId(
            stealView,
            choice.eligibleInstanceIds,
            createRng(`${s.seed}:bot:${actorId}:steal:${s.turnSequence}`),
          ),
        };
      },
      resolvePoolPick: (s: typeof state, actorId: string) => {
        const choice = s.subChoice;
        const actorPolicy = policyByPlayerId.get(actorId);

        if (actorPolicy === undefined) {
          throw new Error(`no policy for seat ${actorId}`);
        }

        if (choice?.kind !== 'pool-pick' || choice.playerId !== actorId) {
          throw new Error('pool pick pending without subChoice');
        }

        const instanceIds = actorPolicy.pickPoolInstanceIds(
          s.pool,
          choice.eligibleInstanceIds.filter((id) =>
            s.pool.some((card) => card.instanceId === id),
          ),
          choice.maxCount,
          createRng(`${s.seed}:bot:${actorId}:pool:${s.turnSequence}`),
        );

        if (instanceIds.length !== choice.maxCount) {
          throw new Error('Pool pick pending but pick failed');
        }

        return { instanceIds };
      },
      resolveSpecialPick: (s: typeof state, actorId: string) => {
        const choice = s.subChoice;
        const actorPolicy = policyByPlayerId.get(actorId);

        if (actorPolicy === undefined) {
          throw new Error(`no policy for seat ${actorId}`);
        }

        if (choice?.kind !== 'special-pick' || choice.playerId !== actorId) {
          throw new Error('special pick pending without subChoice');
        }

        return {
          cardId: actorPolicy.pickSpecialCardId(
            choice.eligibleCardIds,
            createRng(`${s.seed}:bot:${actorId}:special:${s.turnSequence}`),
          ),
        };
      },
      resolveReanimationKit: (s: typeof state, playerId: string) => {
        const choice = s.subChoice;
        const actorPolicy = policyByPlayerId.get(playerId);

        if (actorPolicy === undefined) {
          throw new Error(`no policy for seat ${playerId}`);
        }

        if (choice?.kind !== 'reanimation-kit' || choice.playerId !== playerId) {
          throw new Error('reanimation kit pending without subChoice');
        }

        return {
          kitId: actorPolicy.pickReanimationKitId(
            choice.eligibleKitIds,
            createRng(`${s.seed}:bot:${playerId}:reanim-kit:${s.turnSequence}`),
          ),
        };
      },
      resolveReward: (s: typeof state) => {
        const choice = s.rewardChoice;

        if (choice === null) {
          throw new Error('reward pending without rewardChoice');
        }

        const actorPolicy = policyByPlayerId.get(choice.eliminatorPlayerId);

        if (actorPolicy === undefined) {
          throw new Error(`no policy for seat ${choice.eliminatorPlayerId}`);
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
        const picks = actorPolicy.pickEliminationRewards(
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
          choices: picks.choices,
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
        drawCount: countDrawsForPlayer(player.playerId, actionLog),
        buyCount: player.buyCount,
        sellCount: player.sellCount,
        upgradeCount: player.upgradeCount,
        isBot: true as const,
        botDifficulty,
      };
    }),
    eliminations: snapshot.eliminations,
    ...(input.captureFeatureSnapshots === true
      ? {
          featureSnapshots: labelFeatureSnapshots(
            snapshot.seed,
            unlabeledSnapshots,
            snapshot.winnerPlayerId,
          ),
        }
      : {}),
  };
}

function countDrawsForPlayer(
  playerId: string,
  actionLog: readonly ActionLogEntryView[],
): number {
  let count = 0;

  for (const entry of actionLog) {
    if (
      entry.kind === 'actionPlayed' &&
      entry.actorPlayerId === playerId &&
      entry.action === 'draw'
    ) {
      count += 1;
    }
  }

  return count;
}
