/**
 * L35-07 promotion gate: seat-rotated holdout, p < 0.01 vs Lot 33 champion.
 * Champion is `heuristic-v4` while L33-05 is Blocked (frozen gauntlet).
 *
 * Usage:
 *   pnpm --filter @card-battle/server exec tsx src/simulation/gate-search-v5.ts \
 *     --games 2000 --seed l35-07-gate \
 *     --out ../../docs/simulation/2026-08-13-v5-search-gate/gate.json
 *
 * Lot 40:
 *   ... --policy search-v5-engage --seed l40-05-gate --max-turns 400 \
 *     --out ../../docs/simulation/2026-08-18-v5-engage-gate/gate.json
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { HEURISTIC_V4_POLICY_ID } from '../bots/policies/heuristic-v4';
import { SEARCH_V5_POLICY_ID } from '../bots/policies/search-v5';
import { getPolicy } from '../bots/registry';
import { OFFLINE_SEARCH_ITERATIONS } from '../bots/search/search-budget';
import { computeHeuristicV4WeightsHash } from '../bots/weights-hash';
import { binomialTailPValueGe } from './binomial-test';
import type { FitnessResult } from './fitness-gauntlet';
import { buildFitSplit, type FitMatchup } from './fit-split';
import type { PolicyGateInbound, PolicyGateOutbound } from './policy-gate-worker';
import { wilsonInterval } from './wilson-interval';

const WORKER_PATH = fileURLToPath(new URL('./policy-gate-worker.ts', import.meta.url));

export function parseSearchV5GateArgs(argv: readonly string[]): {
  readonly policy: string;
  readonly games: number;
  readonly seed: string;
  readonly out: string;
  readonly workers: number;
  readonly maxTurns?: number;
} {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--') continue;

    if (token?.startsWith('--') !== true) continue;

    const key = token.slice(2);

    if (key === '') continue;

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

  const maxTurnsRaw = args.get('max-turns');
  const maxTurns =
    maxTurnsRaw === undefined || maxTurnsRaw === ''
      ? undefined
      : Number.parseInt(maxTurnsRaw, 10);

  if (maxTurns !== undefined && (!Number.isFinite(maxTurns) || maxTurns < 1)) {
    throw new Error('--max-turns must be a positive integer');
  }

  const policy = args.get('policy') ?? SEARCH_V5_POLICY_ID;
  getPolicy(policy);

  return {
    policy,
    games,
    seed: args.get('seed') ?? 'l35-07-gate',
    out:
      args.get('out') ??
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../../../docs/simulation/2026-08-13-v5-search-gate/gate.json',
      ),
    workers,
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

async function evaluatePolicyParallel(
  policyId: string,
  matchups: readonly FitMatchup[],
  workerCount: number,
  difficulty: 'easy' | 'normal' | 'hard',
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
          throw new Error('policy-gate worker missing');
        }

        const id = chunkIndex + 1;
        const started = Date.now();

        return await new Promise<FitnessResult>((resolve, reject) => {
          const onMessage = (message: PolicyGateOutbound): void => {
            if (message.id !== id) return;

            worker.off('message', onMessage);
            worker.off('error', onError);

            if (message.type === 'error') {
              reject(new Error(message.message));
              return;
            }

            if (message.type === 'result') {
              console.error(
                JSON.stringify({
                  chunk: chunkIndex,
                  matchups: chunk.length,
                  elapsedMs: Date.now() - started,
                  wins: message.result.wins,
                  losses: message.result.losses,
                  stalls: message.result.stalls,
                }),
              );
              resolve(message.result);
              return;
            }
          };

          const onError = (error: Error): void => {
            worker.off('message', onMessage);
            worker.off('error', onError);
            reject(error);
          };

          worker.on('message', onMessage);
          worker.on('error', onError);

          const message: PolicyGateInbound = {
            type: 'policy-gate',
            id,
            policyId,
            matchups: chunk,
            difficulty,
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
  const config = parseSearchV5GateArgs(process.argv.slice(2));
  const matchupCount = Math.ceil(config.games / 2);
  const split = buildFitSplit({
    baseSeed: config.seed,
    trainCount: 1,
    holdoutCount: matchupCount,
  });
  void split.train;

  const candidate = getPolicy(config.policy);
  const champion = getPolicy(HEURISTIC_V4_POLICY_ID);
  const v4Hash = computeHeuristicV4WeightsHash();
  const started = Date.now();
  console.error(
    JSON.stringify({
      phase: 'start',
      policy: candidate.id,
      games: config.games,
      matchups: matchupCount,
      workers: config.workers,
      offlineSearchIterations: OFFLINE_SEARCH_ITERATIONS,
      ...(config.maxTurns !== undefined ? { maxTurns: config.maxTurns } : {}),
    }),
  );
  const result = await evaluatePolicyParallel(
    candidate.id,
    split.holdout,
    config.workers,
    'hard',
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
    policyId: candidate.id,
    candidateWeightsHash: candidate.weightsHash,
    incumbentPolicyId: champion.id,
    incumbentWeightsHash: v4Hash,
    offlineSearchIterations: OFFLINE_SEARCH_ITERATIONS,
    ...(config.maxTurns !== undefined ? { maxTurns: config.maxTurns } : {}),
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
    meanDecisionLatencyNote:
      'Per-decision latency is embedded in elapsedMs / decisions; room wall-clock is Lot 36.',
    passed,
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
