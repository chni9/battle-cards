/**
 * Configurable gross-imbalance screen runner — technical spec v4 §7 / Lot 31 / v5 L38-01.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { resolveWeightsProfile } from '../bots/profiles/index';
import { getPolicy, listPolicyIds } from '../bots/registry';
import { computePolicyWeightsHash } from '../bots/weights-hash';
import {
  aggregateRows,
  emptyStallLedger,
  recordAttemptedMatchup,
  recordSeatedKits,
  recordStall,
} from './aggregate';
import { serializeGameRow } from './emit-row';
import type { SimulationGameRow } from './run-game';
import {
  buildScreenJobs,
  runScreenJob,
  type ScreenGameJob,
  type ScreenGameResult,
  type ScreenWorkerInbound,
  type ScreenWorkerOutbound,
} from './screen-jobs';
import {
  coverageDroppedVsV4,
  unorderedPairs,
  type ScreenConfig,
} from './screen-config';

const WORKER_PATH = fileURLToPath(new URL('./screen-worker.ts', import.meta.url));

export interface RunScreenOptions {
  /** Test-only: force every game's turn cap (default 2500). */
  maxTurns?: number;
  /** Suppress per-cell progress logs (tests). */
  quiet?: boolean;
}

export interface ScreenRunResult {
  rows: readonly SimulationGameRow[];
  report: ReturnType<typeof aggregateRows>;
  config: ScreenConfig;
  outDir: string;
}

function policyIdsOrThrow(policyId: string): void {
  if (!listPolicyIds().includes(policyId)) {
    throw new Error(`Unknown bot policy: ${policyId}`);
  }
}

function resolvedWeightsHash(config: ScreenConfig): string {
  if (config.weightsProfile !== null) {
    return computePolicyWeightsHash(resolveWeightsProfile(config.weightsProfile));
  }

  return getPolicy(config.policyId).weightsHash;
}

function applyResultsToLedger(
  results: readonly ScreenGameResult[],
  ledger: ReturnType<typeof emptyStallLedger>,
  rows: SimulationGameRow[],
): void {
  for (const result of results) {
    if (result.matchup !== undefined) {
      recordAttemptedMatchup(ledger, result.matchup.kitA, result.matchup.kitB);
    }

    if (result.row === null) {
      recordStall(
        ledger,
        result.seatedKits,
        result.matchup ?? null,
      );
    } else {
      recordSeatedKits(ledger.seatedByKit, result.seatedKits);
      rows.push(result.row);
    }
  }
}

async function runJobsInWorkers(
  jobs: readonly ScreenGameJob[],
  concurrency: number,
  quiet: boolean,
): Promise<readonly ScreenGameResult[]> {
  const workerCount = Math.min(concurrency, jobs.length);
  const workers = Array.from(
    { length: workerCount },
    () =>
      new Worker(WORKER_PATH, {
        execArgv: ['--import', 'tsx'],
      }),
  );
  const slots: (ScreenGameResult | undefined)[] = Array.from({
    length: jobs.length,
  });
  const BATCH = 5;
  let nextOffset = 0;
  let completed = 0;
  let requestId = 0;

  const takeBatch = (): { offset: number; batch: ScreenGameJob[] } | null => {
    if (nextOffset >= jobs.length) {
      return null;
    }

    const offset = nextOffset;
    const batch = [...jobs.slice(offset, offset + BATCH)];
    nextOffset += batch.length;
    return { offset, batch };
  };

  try {
    await Promise.all(
      workers.map(async (worker) => {
        for (;;) {
          const taken = takeBatch();

          if (taken === null) {
            return;
          }

          const id = (requestId += 1);
          const batchResults = await new Promise<readonly ScreenGameResult[]>(
            (resolve, reject) => {
              const onMessage = (message: ScreenWorkerOutbound): void => {
                if (message.id !== id) {
                  return;
                }

                worker.off('message', onMessage);
                worker.off('error', onError);

                if (message.type === 'error') {
                  reject(new Error(message.message));
                  return;
                }

                resolve(message.results);
              };

              const onError = (error: Error): void => {
                worker.off('message', onMessage);
                worker.off('error', onError);
                reject(error);
              };

              worker.on('message', onMessage);
              worker.on('error', onError);

              const inbound: ScreenWorkerInbound = {
                type: 'screen-chunk',
                id,
                jobs: taken.batch,
              };
              worker.postMessage(inbound);
            },
          );

          for (const [index, result] of batchResults.entries()) {
            slots[taken.offset + index] = result;
          }

          completed += taken.batch.length;

          if (!quiet) {
            console.log(`screen ${String(completed)}/${String(jobs.length)}`);
          }
        }
      }),
    );
  } finally {
    await Promise.all(workers.map(async (worker) => worker.terminate()));
  }

  const results: ScreenGameResult[] = [];

  for (const [index, entry] of slots.entries()) {
    if (entry === undefined) {
      throw new Error(`missing screen result at ${String(index)}`);
    }

    results.push(entry);
  }

  return results;
}

export async function runScreen(
  config: ScreenConfig,
  options: RunScreenOptions = {},
): Promise<ScreenRunResult> {
  policyIdsOrThrow(config.policyId);
  await mkdir(config.outDir, { recursive: true });

  const drop = coverageDroppedVsV4(config);

  if (drop !== null && options.quiet !== true) {
    console.log(drop);
  }

  const jobs = buildScreenJobs(config, options.maxTurns);
  const useWorkers = config.concurrency > 1 && process.env['VITEST'] === undefined;

  if (options.quiet !== true) {
    console.log(
      `Screen ${config.policyId} × ${String(jobs.length)} games, searchIterations=${String(config.searchIterations)}, concurrency=${String(useWorkers ? config.concurrency : 1)}`,
    );
  }
  const results = useWorkers
    ? await runJobsInWorkers(jobs, config.concurrency, options.quiet === true)
    : jobs.map((job) => runScreenJob(job));

  const rows: SimulationGameRow[] = [];
  const ledger = emptyStallLedger();
  applyResultsToLedger(results, ledger, rows);
  rows.sort((left, right) => left.seed.localeCompare(right.seed));

  const report = aggregateRows(rows, ledger);
  const jsonl = rows.map((row) => serializeGameRow(row)).join('');
  const pairs = unorderedPairs(config.oneVOneKits);
  const policyWeightsHash = getPolicy(config.policyId).weightsHash;
  const resolvedHash = resolvedWeightsHash(config);

  const configPayload = {
    baseSeed: config.baseSeed,
    gamesPerCell: config.gamesPerCell,
    difficulty: config.difficulty,
    oneVOneKits: config.oneVOneKits,
    oneVOnePairs: pairs,
    fourPlayer: config.fourPlayer,
    undersampledCardThreshold: config.undersampledCardThreshold,
    coverageNote: config.coverageNote,
    policyId: config.policyId,
    weightsProfile: config.weightsProfile,
    policyWeightsHash,
    resolvedWeightsHash: resolvedHash,
    searchIterations: config.searchIterations,
    concurrency: config.concurrency,
    coverageDroppedVsV4: drop,
  };

  await writeFile(
    `${config.outDir}/config.json`,
    `${JSON.stringify(configPayload, null, 2)}\n`,
  );
  await writeFile(`${config.outDir}/games.jsonl`, jsonl);
  await writeFile(
    `${config.outDir}/aggregates.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  );

  if (options.quiet !== true) {
    console.log(
      `Completed ${String(report.completedGames)} games, stalled ${String(report.stalledGames)}. Wrote ${config.outDir}`,
    );
  }

  return { rows, report, config, outDir: config.outDir };
}
