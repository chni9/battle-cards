/**
 * Forward-model throughput bench — technical spec v5 §4.1 / §7.3 (L32-05).
 *
 * Run via pnpm only (devEngines-pinned Node): 
 *   `pnpm --filter @card-battle/server bench:forward-model`
 *
 * Every V5 search budget must cite these numbers.
 */

import { performance } from 'node:perf_hooks';

import type { ActionLogEntryView, GameState } from '@card-battle/shared';

import { createInitialState } from '../../engine/create-initial-state';
import { createRng } from '../../engine/rng';
import { listAvailableRewardCards } from '../../engine/turn/elimination-rewards';
import { listLegalActions } from '../../engine/turn/list-legal-actions';
import { performAndCompleteTurn } from '../../engine/turn/orchestrate-turn';
import { makeCounterEffect } from '../../testing/factories';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { SIM_NOW_MS } from '../../simulation/run-game';
import { getDefaultPolicy } from '../registry';
import { cloneGameState } from './clone-state';

function makePending(
  overrides: Partial<{
    id: string;
    sourcePlayerId: string;
    targetPlayerId: string;
  }> = {},
) {
  return {
    id: overrides.id ?? 'pe-bench',
    sourcePlayerId: overrides.sourcePlayerId ?? 'bot-1',
    targetPlayerId: overrides.targetPlayerId ?? 'bot-0',
    cardId: 'basic-attack' as const,
    queuedAt: 0,
    isUpgraded: false,
    damageMultiplier: 1,
    redirectedBy: null,
    chosenInstanceId: null,
  };
}

/** 4-player mid-game-ish fixture: populated pool + active persistents. */
export function buildBenchState(): GameState {
  const state = createInitialState({
    seats: [
      { id: 'bot-0', nickname: 'A' },
      { id: 'bot-1', nickname: 'B' },
      { id: 'bot-2', nickname: 'C' },
      { id: 'bot-3', nickname: 'D' },
    ],
    seed: 'l32-05-bench-midgame',
    kitAssignment: ['assassin', 'kamikaze', 'scientific', 'untouchable'],
  });

  state.turnSequence = 40;
  state.currentTurnPlayerId = 'bot-0';
  state.pool.push(
    { instanceId: 'pool:tax:0', cardId: 'tax', isUpgraded: false },
    { instanceId: 'pool:spy:0', cardId: 'spy', isUpgraded: false },
    { instanceId: 'pool:mirror:0', cardId: 'mirror', isUpgraded: true },
    { instanceId: 'pool:block:0', cardId: 'block', isUpgraded: false },
  );

  for (const [index, player] of state.players.entries()) {
    player.points = 12 + index;
    player.upgradePoints = 1;
    player.activePersistentEffects.push(
      makeCounterEffect({
        id: `${player.id}:pg`,
        cardId: 'points-generator',
        counter: 2,
      }),
    );

    if (index === 0) {
      player.pendingEffects.push(
        makePending({
          id: 'pe-incoming',
          sourcePlayerId: 'bot-1',
          targetPlayerId: 'bot-0',
        }),
      );
    }
  }

  return state;
}

function policyHooks(_root: GameState, actionLog: ActionLogEntryView[]) {
  const policy = getDefaultPolicy();

  return {
    resolveMirror: (s: GameState, actorId: string) => {
      const view = buildPlayingViewFor({
        recipientSessionId: actorId,
        gameCode: 'BENCH',
        state: s,
        turnDeadlineMs: null,
        actionLog,
      });
      const pick = policy.pickMirrorRedirect(
        view,
        createRng(`${s.seed}:bot:${actorId}:mirror:${s.turnSequence}`),
        s.mirrorChoice?.eligibleEffectIds,
      );

      if (pick === null) {
        throw new Error('mirror null');
      }

      return pick;
    },
    resolveSteal: (s: GameState, actorId: string) => {
      const choice = s.stealChoice;

      if (choice === null || choice.eligibleInstanceIds.length === 0) {
        throw new Error('steal');
      }

      const view = buildPlayingViewFor({
        recipientSessionId: actorId,
        gameCode: 'BENCH',
        state: s,
        turnDeadlineMs: null,
        actionLog,
      });

      return {
        instanceId: policy.pickStealInstanceId(
          view,
          choice.eligibleInstanceIds,
          createRng(`${s.seed}:bot:${actorId}:steal:${s.turnSequence}`),
        ),
      };
    },
    resolvePoolPick: (s: GameState, actorId: string) => {
      const choice = s.subChoice;

      if (choice?.kind !== 'pool-pick') {
        throw new Error('pool');
      }

      return {
        instanceIds: policy.pickPoolInstanceIds(
          s.pool,
          choice.eligibleInstanceIds,
          choice.maxCount,
          createRng(`${s.seed}:bot:${actorId}:pool:${s.turnSequence}`),
        ),
      };
    },
    resolveSpecialPick: (s: GameState, actorId: string) => {
      const choice = s.subChoice;

      if (choice?.kind !== 'special-pick') {
        throw new Error('special');
      }

      return {
        cardId: policy.pickSpecialCardId(
          choice.eligibleCardIds,
          createRng(`${s.seed}:bot:${actorId}:special:${s.turnSequence}`),
        ),
      };
    },
    resolveReanimationKit: (s: GameState, playerId: string) => {
      const choice = s.subChoice;

      if (choice?.kind !== 'reanimation-kit') {
        throw new Error('reanim');
      }

      return {
        kitId: policy.pickReanimationKitId(
          choice.eligibleKitIds,
          createRng(`${s.seed}:bot:${playerId}:reanim:${s.turnSequence}`),
        ),
      };
    },
    resolveReward: (s: GameState) => {
      const choice = s.rewardChoice;

      if (choice === null) {
        throw new Error('reward');
      }

      const view = buildPlayingViewFor({
        recipientSessionId: choice.eliminatorPlayerId,
        gameCode: 'BENCH',
        state: s,
        turnDeadlineMs: null,
        actionLog,
      });
      const available = listAvailableRewardCards(s, choice.eliminatedPlayerId);
      const picks = policy.pickEliminationRewards(
        view,
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
}

export interface ForwardModelBenchResult {
  structuredCloneNs: number;
  structuredCloneBytes: number;
  cloneGameStateNs: number;
  turnsPerSecond: number;
  truncatedPlayoutsPerSecond: number;
  iterations: {
    clone: number;
    turns: number;
    playouts: number;
    playoutDepth: number;
  };
}

export function runForwardModelBench(options?: {
  cloneIters?: number;
  turnIters?: number;
  playoutIters?: number;
  playoutDepth?: number;
}): ForwardModelBenchResult {
  const cloneIters = options?.cloneIters ?? 2_000;
  const turnIters = options?.turnIters ?? 200;
  const playoutIters = options?.playoutIters ?? 50;
  const playoutDepth = options?.playoutDepth ?? 8;

  const fixture = buildBenchState();
  const encoded = Buffer.byteLength(JSON.stringify(fixture), 'utf8');

  // Warmup
  for (let i = 0; i < 20; i += 1) {
    structuredClone(fixture);
    cloneGameState(fixture);
  }

  const t0 = performance.now();

  for (let i = 0; i < cloneIters; i += 1) {
    structuredClone(fixture);
  }

  const structuredCloneNs = ((performance.now() - t0) * 1e6) / cloneIters;

  const t1 = performance.now();

  for (let i = 0; i < cloneIters; i += 1) {
    cloneGameState(fixture);
  }

  const cloneGameStateNs = ((performance.now() - t1) * 1e6) / cloneIters;

  const policy = getDefaultPolicy();
  const turnDurations: number[] = [];

  for (let i = 0; i < turnIters; i += 1) {
    const state = cloneGameState(fixture);
    const actionLog: ActionLogEntryView[] = [];
    const botId = state.currentTurnPlayerId ?? 'bot-0';
    state.currentTurnPlayerId = botId;
    const view = buildPlayingViewFor({
      recipientSessionId: botId,
      gameCode: 'BENCH',
      state,
      turnDeadlineMs: null,
      actionLog,
    });
    const actions = listLegalActions(state, botId);
    const rng = createRng(`${state.seed}:bench-turn:${String(i)}`);
    const action =
      actions.length === 0
        ? { type: 'draw' as const }
        : policy.decide(view, actions, rng, { actionLog }).action;
    const hooks = policyHooks(state, actionLog);
    const started = performance.now();
    performAndCompleteTurn(state, botId, action, hooks, { nowMs: SIM_NOW_MS });
    turnDurations.push(performance.now() - started);
  }

  const meanTurnMs =
    turnDurations.reduce((sum, value) => sum + value, 0) / turnDurations.length;
  const turnsPerSecond = meanTurnMs > 0 ? 1000 / meanTurnMs : 0;

  const playoutDurations: number[] = [];

  for (let i = 0; i < playoutIters; i += 1) {
    const state = cloneGameState(fixture);
    const actionLog: ActionLogEntryView[] = [];
    const hooks = policyHooks(state, actionLog);
    const started = performance.now();

    for (let depth = 0; depth < playoutDepth; depth += 1) {
      const botId = state.currentTurnPlayerId;

      if (botId === null) {
        break;
      }

      const living = state.players.filter((player) => !player.isEliminated).length;

      if (living <= 1) {
        break;
      }

      const view = buildPlayingViewFor({
        recipientSessionId: botId,
        gameCode: 'BENCH',
        state,
        turnDeadlineMs: null,
        actionLog,
      });
      const actions = listLegalActions(state, botId);
      const rng = createRng(`${state.seed}:bench-playout:${String(i)}:${String(depth)}`);
      const action =
        actions.length === 0
          ? { type: 'draw' as const }
          : policy.decide(view, actions, rng, { actionLog }).action;
      const result = performAndCompleteTurn(state, botId, action, hooks, {
        nowMs: SIM_NOW_MS,
      });

      if (!result.ok) {
        performAndCompleteTurn(state, botId, { type: 'draw' }, hooks, {
          nowMs: SIM_NOW_MS,
        });
      }
    }

    playoutDurations.push(performance.now() - started);
  }

  const meanPlayoutMs =
    playoutDurations.reduce((sum, value) => sum + value, 0) / playoutDurations.length;
  const truncatedPlayoutsPerSecond = meanPlayoutMs > 0 ? 1000 / meanPlayoutMs : 0;

  return {
    structuredCloneNs,
    structuredCloneBytes: encoded,
    cloneGameStateNs,
    turnsPerSecond,
    truncatedPlayoutsPerSecond,
    iterations: {
      clone: cloneIters,
      turns: turnIters,
      playouts: playoutIters,
      playoutDepth,
    },
  };
}

function formatResult(result: ForwardModelBenchResult): string {
  return [
    'L32-05 forward-model bench',
    `  structuredClone: ${result.structuredCloneNs.toFixed(0)} ns/state, ${String(result.structuredCloneBytes)} bytes JSON`,
    `  cloneGameState:  ${result.cloneGameStateNs.toFixed(0)} ns/state`,
    `  turns/sec:       ${result.turnsPerSecond.toFixed(1)} (performAndCompleteTurn + SIM_NOW_MS)`,
    `  truncated playouts/sec: ${result.truncatedPlayoutsPerSecond.toFixed(1)} (depth ${String(result.iterations.playoutDepth)})`,
  ].join('\n');
}

const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('bench-forward-model.ts') ||
    process.argv[1].includes('bench-forward-model'));

if (isMain) {
  const result = runForwardModelBench();
  console.log(formatResult(result));
  console.log(JSON.stringify(result));
}
