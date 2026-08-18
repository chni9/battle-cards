/**
 * L37-04 gate: search+fitted vs search+linear at the same offline iteration budget.
 * Promote only on p < 0.01 over at least 2000 seat-rotated games + developer playtest.
 *
 * Usage:
 *   pnpm --filter @card-battle/server gate:fitted-eval -- \
 *     --games 2000 --seed l37-04-gate \
 *     --out ../../docs/simulation/2026-08-13-v5-fitted/gate.json
 *
 * Lot 40 engage prior:
 *   ... --prior engage --fitted-profile search-engage-fitted-logistic \
 *     --search-iterations 64 --max-turns 400
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { OFFLINE_SEARCH_ITERATIONS } from '../bots/search/search-budget';
import { computePolicyWeightsHash } from '../bots/weights-hash';
import { binomialTailPValueGe } from './binomial-test';
import type { FitnessResult } from './fitness-gauntlet';
import { buildFitSplit, type FitMatchup } from './fit-split';
import {
  FITTED_LINEAR_PROFILE_ID,
  FITTED_LOGISTIC_PROFILE_ID,
  parseFittedSearchPrior,
  resolveGateWeights,
  type FittedEvalGateInbound,
  type FittedEvalGateOutbound,
  type FittedSearchPrior,
} from './fitted-eval-gate-shared';
import { wilsonInterval } from './wilson-interval';

export {
  ENGAGE_FITTED_LOGISTIC_PROFILE_ID,
  FITTED_LINEAR_PROFILE_ID,
  FITTED_LOGISTIC_PROFILE_ID,
  parseFittedSearchPrior,
  resolveGateWeights,
} from './fitted-eval-gate-shared';
export type {
  FittedEvalGateInbound,
  FittedEvalGateOutbound,
} from './fitted-eval-gate-shared';

const WORKER_PATH = fileURLToPath(new URL('./fitted-eval-gate-worker.ts', import.meta.url));

export function parseFittedEvalGateArgs(argv: readonly string[]): {
  readonly games: number;
  readonly seed: string;
  readonly out: string;
  readonly workers: number;
  readonly linearProfileId: string;
  readonly fittedProfileId: string;
  readonly prior: FittedSearchPrior;
  readonly searchIterations: number;
  readonly maxTurns?: number;
} {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--' || token?.startsWith('--') !== true) continue;

    const key = token.slice(2);
    const value = argv[index + 1];

    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    args.set(key, value);
    index += 1;
  }

  const games = Number.parseInt(args.get('games') ?? '2000', 10);
  const workersRaw = args.get('workers');
  const workers =
    workersRaw !== undefined
      ? Number.parseInt(workersRaw, 10)
      : Math.max(1, Math.min(availableParallelism(), 8));
  const searchIterationsRaw = args.get('search-iterations');
  const searchIterations =
    searchIterationsRaw === undefined || searchIterationsRaw === ''
      ? OFFLINE_SEARCH_ITERATIONS
      : Number.parseInt(searchIterationsRaw, 10);

  if (!Number.isFinite(searchIterations) || searchIterations < 1) {
    throw new Error('--search-iterations must be a positive integer');
  }

  const maxTurnsRaw = args.get('max-turns');
  const maxTurns =
    maxTurnsRaw === undefined || maxTurnsRaw === ''
      ? undefined
      : Number.parseInt(maxTurnsRaw, 10);

  if (maxTurns !== undefined && (!Number.isFinite(maxTurns) || maxTurns < 1)) {
    throw new Error('--max-turns must be a positive integer');
  }

  return {
    games,
    seed: args.get('seed') ?? 'l37-04-gate',
    out:
      args.get('out') ??
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../../../docs/simulation/2026-08-13-v5-fitted/gate.json',
      ),
    workers,
    linearProfileId: args.get('linear-profile') ?? FITTED_LINEAR_PROFILE_ID,
    fittedProfileId: args.get('fitted-profile') ?? FITTED_LOGISTIC_PROFILE_ID,
    prior: parseFittedSearchPrior(args.get('prior')),
    searchIterations,
    ...(maxTurns !== undefined ? { maxTurns } : {}),
  };
}

function mergeFitness(partials: readonly FitnessResult[]): FitnessResult {
  let wins = 0;
  let losses = 0;
  let stalls = 0;
  let games = 0;

  for (const partial of partials) {
    wins += partial.wins;
    losses += partial.losses;
    stalls += partial.stalls;
    games += partial.games;
  }

  const decided = wins + losses;
  return {
    wins,
    losses,
    stalls,
    games,
    winRate: decided === 0 ? 0 : wins / decided,
  };
}

async function evaluateParallel(
  matchups: readonly FitMatchup[],
  workerCount: number,
  linearProfileId: string,
  fittedProfileId: string,
  searchIterations: number,
  prior: FittedSearchPrior,
  maxTurns: number | undefined,
): Promise<FitnessResult> {
  if (matchups.length === 0) {
    return { wins: 0, losses: 0, stalls: 0, games: 0, winRate: 0 };
  }

  const chunkCount = Math.min(workerCount, matchups.length);
  const chunkSize = Math.ceil(matchups.length / chunkCount);
  const chunks: FitMatchup[][] = [];

  for (let index = 0; index < matchups.length; index += chunkSize) {
    chunks.push([...matchups.slice(index, index + chunkSize)]);
  }

  const workers = chunks.map(
    () =>
      new Worker(WORKER_PATH, {
        execArgv: ['--import', 'tsx'],
      }),
  );

  try {
    const partials = await Promise.all(
      chunks.map(async (chunk, chunkIndex) => {
        const worker = workers[chunkIndex];

        if (worker === undefined) {
          throw new Error('fitted-eval gate worker missing');
        }

        const id = chunkIndex + 1;

        return await new Promise<FitnessResult>((resolve, reject) => {
          const onMessage = (message: FittedEvalGateOutbound): void => {
            if (message.id !== id) return;

            worker.off('message', onMessage);
            worker.off('error', onError);

            if (message.type === 'error') {
              reject(new Error(message.message));
              return;
            }

            resolve(message.result);
          };

          const onError = (error: Error): void => {
            worker.off('message', onMessage);
            worker.off('error', onError);
            reject(error);
          };

          worker.on('message', onMessage);
          worker.on('error', onError);

          const message: FittedEvalGateInbound = {
            type: 'fitted-eval-gate',
            id,
            matchups: chunk,
            linearProfileId,
            fittedProfileId,
            searchIterations,
            prior,
            ...(maxTurns !== undefined ? { maxTurns } : {}),
          };
          worker.postMessage(message);
        });
      }),
    );

    return mergeFitness(partials);
  } finally {
    await Promise.all(workers.map(async (worker) => worker.terminate()));
  }
}

async function main(): Promise<void> {
  const config = parseFittedEvalGateArgs(process.argv.slice(2));
  const matchupCount = Math.ceil(config.games / 2);
  const split = buildFitSplit({
    baseSeed: config.seed,
    trainCount: 1,
    holdoutCount: matchupCount,
  });
  void split.train;

  const linearWeights = resolveGateWeights(config.linearProfileId);
  const fittedWeights = resolveGateWeights(config.fittedProfileId);
  const started = Date.now();
  console.error(
    JSON.stringify({
      phase: 'start',
      games: config.games,
      matchups: matchupCount,
      workers: config.workers,
      offlineSearchIterations: config.searchIterations,
      prior: config.prior,
      linearProfileId: config.linearProfileId,
      fittedProfileId: config.fittedProfileId,
      ...(config.maxTurns !== undefined ? { maxTurns: config.maxTurns } : {}),
    }),
  );

  const result = await evaluateParallel(
    split.holdout,
    config.workers,
    config.linearProfileId,
    config.fittedProfileId,
    config.searchIterations,
    config.prior,
    config.maxTurns,
  );
  const elapsedMs = Date.now() - started;
  const decided = result.wins + result.losses;
  const pValue = binomialTailPValueGe(result.wins, decided, 0.5);
  const wilson = wilsonInterval(result.wins, decided);
  const passed =
    decided >= Math.floor(config.games * 0.75) &&
    result.winRate > 0.5 &&
    pValue < 0.01 &&
    Number.isFinite(pValue);

  const report = {
    candidate: {
      profileId: config.fittedProfileId,
      weightsHash: computePolicyWeightsHash(fittedWeights),
      evaluatorKind: fittedWeights.evaluator.kind ?? 'linear',
      fittedModelId: fittedWeights.evaluator.fittedModelId ?? null,
    },
    incumbent: {
      profileId: config.linearProfileId,
      weightsHash: computePolicyWeightsHash(linearWeights),
      evaluatorKind: linearWeights.evaluator.kind ?? 'linear',
    },
    offlineSearchIterations: config.searchIterations,
    ...(config.maxTurns !== undefined ? { maxTurns: config.maxTurns } : {}),
    prior: config.prior,
    seed: config.seed,
    requestedGames: config.games,
    matchups: matchupCount,
    workers: config.workers,
    wins: result.wins,
    losses: result.losses,
    stalls: result.stalls,
    gamesPlayed: result.games,
    decided,
    winRate: result.winRate,
    wilson,
    pValueOneSided: pValue,
    elapsedMs,
    passed,
    promotionNote:
      config.prior === 'engage'
        ? 'Promote engage-search fitted evaluator only on p < 0.01 + playtest. Do not flip DEFAULT_POLICY_ID (L40-04).'
        : 'Promote search-v5 default evaluator only on pass + developer playtest. Do not flip DEFAULT_POLICY_ID (L35-07).',
  };

  mkdirSync(path.dirname(path.resolve(config.out)), { recursive: true });
  writeFileSync(config.out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));

  if (!passed) {
    process.exitCode = 2;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
