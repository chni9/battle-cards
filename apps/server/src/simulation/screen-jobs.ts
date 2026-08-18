/**
 * Per-game screen jobs — L38-01. Plain data only; no GameState on the wire.
 */

import type { BotDifficulty, KitId } from '@card-battle/shared';

import { createInitialState } from '../engine/create-initial-state';
import { isStallError } from './run-batch';
import { runSimulatedGame, type SimulationGameRow } from './run-game';
import { unorderedPairs, type ScreenConfig } from './screen-config';

export interface ScreenGameJob {
  readonly seed: string;
  readonly playerCount: number;
  readonly difficulties: readonly BotDifficulty[];
  readonly policyId: string;
  readonly weightsProfile: string | null;
  readonly searchIterations: number;
  readonly kitAssignment?: readonly KitId[];
  readonly maxTurns?: number;
  readonly matchup?: { readonly kitA: KitId; readonly kitB: KitId };
}

export interface ScreenGameResult {
  readonly seed: string;
  readonly row: SimulationGameRow | null;
  readonly seatedKits: readonly KitId[];
  readonly matchup?: { readonly kitA: KitId; readonly kitB: KitId };
}

export interface ScreenWorkerInbound {
  readonly type: 'screen-chunk';
  readonly id: number;
  readonly jobs: readonly ScreenGameJob[];
}

export type ScreenWorkerOutbound =
  | {
      readonly type: 'result';
      readonly id: number;
      readonly results: readonly ScreenGameResult[];
    }
  | { readonly type: 'error'; readonly id: number; readonly message: string };

function peekStartingKits(seed: string, playerCount: number): readonly KitId[] {
  const seats = Array.from({ length: playerCount }, (_, index) => ({
    id: `bot-${String(index)}`,
    nickname: `Bot${String(index)}`,
  }));
  const state = createInitialState({ seats, seed });
  return state.players.map((player) => player.kitId);
}

function difficultiesFor(playerCount: number, difficulty: BotDifficulty): readonly BotDifficulty[] {
  return Array.from({ length: playerCount }, () => difficulty);
}

export function buildScreenJobs(
  config: ScreenConfig,
  maxTurns: number | undefined,
): readonly ScreenGameJob[] {
  const jobs: ScreenGameJob[] = [];
  const pairs = unorderedPairs(config.oneVOneKits);
  const maxTurnsOpt = maxTurns !== undefined ? { maxTurns } : {};

  for (const [kitA, kitB] of pairs) {
    for (let index = 0; index < config.gamesPerCell; index += 1) {
      jobs.push({
        seed: `${config.baseSeed}:1v1:${kitA}-vs-${kitB}:${String(index)}`,
        playerCount: 2,
        difficulties: difficultiesFor(2, config.difficulty),
        policyId: config.policyId,
        weightsProfile: config.weightsProfile,
        searchIterations: config.searchIterations,
        kitAssignment: [kitA, kitB],
        matchup: { kitA, kitB },
        ...maxTurnsOpt,
      });
    }
  }

  if (config.fourPlayer.mode === 'fixed') {
    const mix = config.fourPlayer.mix;

    if (mix === undefined) {
      throw new Error('fixed four-player mode requires mix');
    }

    for (let index = 0; index < config.fourPlayer.games; index += 1) {
      jobs.push({
        seed: `${config.baseSeed}:4p-one-each:${String(index)}`,
        playerCount: 4,
        difficulties: difficultiesFor(4, config.difficulty),
        policyId: config.policyId,
        weightsProfile: config.weightsProfile,
        searchIterations: config.searchIterations,
        kitAssignment: mix,
        ...maxTurnsOpt,
      });
    }
  } else {
    for (let index = 0; index < config.fourPlayer.games; index += 1) {
      jobs.push({
        seed: `${config.baseSeed}:4p-random:${String(index)}`,
        playerCount: 4,
        difficulties: difficultiesFor(4, config.difficulty),
        policyId: config.policyId,
        weightsProfile: config.weightsProfile,
        searchIterations: config.searchIterations,
        ...maxTurnsOpt,
      });
    }
  }

  return jobs;
}

export function runScreenJob(job: ScreenGameJob): ScreenGameResult {
  const policyIds = Array.from({ length: job.playerCount }, () => job.policyId);

  try {
    const row = runSimulatedGame({
      seed: job.seed,
      playerCount: job.playerCount,
      difficulties: job.difficulties,
      policyIds,
      weightsProfile: job.weightsProfile,
      searchIterations: job.searchIterations,
      ...(job.kitAssignment !== undefined ? { kitAssignment: job.kitAssignment } : {}),
      ...(job.maxTurns !== undefined ? { maxTurns: job.maxTurns } : {}),
    });
    const seatedKits =
      job.kitAssignment ?? row.players.map((player) => player.startingKitId);

    return {
      seed: job.seed,
      row,
      seatedKits,
      ...(job.matchup !== undefined ? { matchup: job.matchup } : {}),
    };
  } catch (error) {
    if (!isStallError(error)) {
      throw error;
    }

    const seatedKits =
      job.kitAssignment ?? peekStartingKits(job.seed, job.playerCount);

    return {
      seed: job.seed,
      row: null,
      seatedKits,
      ...(job.matchup !== undefined ? { matchup: job.matchup } : {}),
    };
  }
}
