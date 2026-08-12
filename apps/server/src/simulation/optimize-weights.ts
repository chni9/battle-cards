/**
 * (1+λ)-ES weight optimizer — technical spec v5 §5.2 (L33-03).
 *
 * Usage:
 *   pnpm --filter @card-battle/server optimize:weights -- \
 *     --seed fit --out ./docs/simulation/fit-run --gens 20 --lambda 8 --train 24 --holdout 24
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  clonePolicyWeights,
  DEFAULT_POLICY_WEIGHTS,
  parsePolicyWeights,
  type PolicyWeights,
} from '../bots/policy-weights';
import { computePolicyWeightsHash } from '../bots/weights-hash';
import { createRng } from '../engine/rng';
import { FROZEN_GAUNTLET_POLICY_IDS } from './gauntlet';
import { evaluateFitnessAgainstGauntlet } from './fitness-gauntlet';
import { FitnessWorkerPool } from './fitness-pool';
import { buildFitSplit, writeFitSplit, type FitSplit } from './fit-split';
import { mutatePolicyWeights } from './mutate-weights';

export interface Optimizer {
  readonly name: string;
  step(parent: PolicyWeights, generation: number): Promise<{
    readonly elite: PolicyWeights;
    readonly fitness: number;
    readonly population: readonly { readonly hash: string; readonly fitness: number }[];
  }>;
}

export interface OptimizeCheckpoint {
  readonly version: number;
  readonly generation: number;
  readonly elite: PolicyWeights;
  readonly eliteFitness: number;
  readonly sigma: number;
  readonly curve: readonly { readonly generation: number; readonly fitness: number }[];
  readonly splitHash: string;
  readonly rngSalt: string;
}

export interface OptimizeConfig {
  readonly seed: string;
  readonly outDir: string;
  readonly generations: number;
  readonly lambda: number;
  readonly trainCount: number;
  readonly holdoutCount: number;
  readonly sigma: number;
  readonly maxTurns?: number;
}

export function parseOptimizeArgs(argv: readonly string[]): OptimizeConfig {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--' || token?.startsWith('--') !== true) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];

    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    args.set(key, value);
    index += 1;
  }

  const seed = requireArg(args, 'seed');
  const outDir = requireArg(args, 'out');
  const generations = Number.parseInt(args.get('gens') ?? '20', 10);
  const lambda = Number.parseInt(args.get('lambda') ?? '8', 10);
  const trainCount = Number.parseInt(args.get('train') ?? '24', 10);
  const holdoutCount = Number.parseInt(args.get('holdout') ?? '24', 10);
  const sigma = Number.parseFloat(args.get('sigma') ?? '1');
  const maxTurnsRaw = args.get('max-turns');

  if (!Number.isFinite(generations) || generations < 1) {
    throw new Error('--gens must be ≥ 1');
  }

  if (!Number.isFinite(lambda) || lambda < 1) {
    throw new Error('--lambda must be ≥ 1');
  }

  return {
    seed,
    outDir,
    generations,
    lambda,
    trainCount,
    holdoutCount,
    sigma,
    ...(maxTurnsRaw !== undefined
      ? { maxTurns: Number.parseInt(maxTurnsRaw, 10) }
      : {}),
  };
}

function requireArg(args: ReadonlyMap<string, string>, key: string): string {
  const value = args.get(key);

  if (value === undefined || value === '') {
    throw new Error(`Missing required --${key}`);
  }

  return value;
}

/** Carve train into fit (selection) + valid (anti-overfit gate). Holdout stays untouched. */
export function carveTrainFitValid(
  train: FitSplit['train'],
): { readonly fit: FitSplit['train']; readonly valid: FitSplit['train'] } {
  if (train.length < 10) {
    return { fit: train, valid: train };
  }

  const cut = Math.max(1, Math.floor(train.length * 0.8));
  return {
    fit: train.slice(0, cut),
    valid: train.slice(cut),
  };
}

/** Mean win-rate across k folds of `matchups` (deterministic partitions). */
export async function kFoldFitness(
  weights: PolicyWeights,
  matchups: FitSplit['train'],
  folds: number,
  evaluate: (weights: PolicyWeights, matchups: FitSplit['train']) => Promise<{ winRate: number }>,
): Promise<number> {
  const foldCount = Math.max(2, Math.min(folds, matchups.length));
  const rates: number[] = [];

  for (let fold = 0; fold < foldCount; fold += 1) {
    const subset = matchups.filter((_, index) => index % foldCount === fold);
    if (subset.length === 0) {
      continue;
    }
    const result = await evaluate(weights, subset);
    rates.push(result.winRate);
  }

  if (rates.length === 0) {
    return 0;
  }

  return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
}

export function createOnePlusLambdaEs(input: {
  readonly lambda: number;
  readonly sigma: number;
  readonly split: FitSplit;
  readonly seed: string;
  readonly maxTurns?: number;
  readonly pool?: FitnessWorkerPool;
}): Optimizer {
  const { fit, valid } = carveTrainFitValid(input.split.train);

  return {
    name: 'one-plus-lambda-es',
    async step(parent, generation) {
      const rng = createRng(`${input.seed}:es:gen:${String(generation)}`);
      const candidates: PolicyWeights[] = [parent];

      for (let index = 0; index < input.lambda; index += 1) {
        candidates.push(
          mutatePolicyWeights(parent, createRng(`${input.seed}:mut:${String(generation)}:${String(index)}`), input.sigma),
        );
      }

      const options = {
        ...(input.maxTurns !== undefined ? { maxTurns: input.maxTurns } : {}),
        difficulty: 'hard' as const,
      };

      const evaluate = async (weights: PolicyWeights, matchups: FitSplit['train']) =>
        input.pool !== undefined
          ? input.pool.evaluate(weights, matchups, options)
          : evaluateFitnessAgainstGauntlet(weights, matchups, options);

      // Rank on fit; promote only if valid does not regress vs parent (anti-overfit).
      const scored = await Promise.all(
        candidates.map(async (weights) => {
          const fitness = await evaluate(weights, fit);
          return {
            weights,
            hash: computePolicyWeightsHash(weights),
            fitness: fitness.winRate,
          };
        }),
      );

      scored.sort((left, right) => right.fitness - left.fitness);

      const parentValid = await evaluate(parent, valid);
      let elite = parent;
      let eliteFitness = scored.find((entry) => entry.weights === parent)?.fitness ?? 0;

      for (const candidate of scored) {
        if (candidate.weights === parent) {
          elite = parent;
          eliteFitness = candidate.fitness;
          break;
        }

        const validResult = await evaluate(candidate.weights, valid);
        if (validResult.winRate + 1e-9 >= parentValid.winRate) {
          elite = candidate.weights;
          eliteFitness = candidate.fitness;
          break;
        }
      }

      void rng;
      return {
        elite,
        fitness: eliteFitness,
        population: scored.map((entry) => ({ hash: entry.hash, fitness: entry.fitness })),
      };
    },
  };
}

export async function runOptimize(config: OptimizeConfig): Promise<{
  readonly elite: PolicyWeights;
  readonly eliteFitness: number;
  readonly split: FitSplit;
  readonly curve: readonly { readonly generation: number; readonly fitness: number }[];
}> {
  mkdirSync(config.outDir, { recursive: true });
  const splitPath = path.join(config.outDir, 'fit-split.json');
  const checkpointPath = path.join(config.outDir, 'checkpoint.json');
  const split = buildFitSplit({
    baseSeed: config.seed,
    trainCount: config.trainCount,
    holdoutCount: config.holdoutCount,
  });
  writeFitSplit(splitPath, split);

  let elite = clonePolicyWeights(DEFAULT_POLICY_WEIGHTS);
  let eliteFitness = 0;
  let startGeneration = 0;
  const curve: { generation: number; fitness: number }[] = [];

  try {
    const raw = JSON.parse(readFileSync(checkpointPath, 'utf8')) as OptimizeCheckpoint;

    if (raw.version !== 1) {
      throw new Error(`Unsupported checkpoint version ${String(raw.version)}`);
    }

    if (raw.splitHash === split.contentHash) {
      elite = raw.elite;
      eliteFitness = raw.eliteFitness;
      startGeneration = raw.generation + 1;
      curve.push(...raw.curve);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unsupported checkpoint')) {
      throw error;
    }
    // no usable checkpoint — optional warm-start from elite.json in outDir
    try {
      const warm = JSON.parse(
        readFileSync(path.join(config.outDir, 'elite.json'), 'utf8'),
      ) as unknown;
      elite = clonePolicyWeights(parsePolicyWeights(warm));
    } catch {
      // keep DEFAULT_POLICY_WEIGHTS
    }
  }

  // Vitest cannot spawn tsx worker threads reliably — keep fitness in-process.
  const useWorkers = process.env['VITEST'] === undefined;
  const pool = useWorkers ? new FitnessWorkerPool() : undefined;
  const optimizer = createOnePlusLambdaEs({
    lambda: config.lambda,
    sigma: config.sigma,
    split,
    seed: config.seed,
    ...(pool !== undefined ? { pool } : {}),
    ...(config.maxTurns !== undefined ? { maxTurns: config.maxTurns } : {}),
  });

  try {
    for (let generation = startGeneration; generation < config.generations; generation += 1) {
      const step = await optimizer.step(elite, generation);
      elite = step.elite;
      eliteFitness = step.fitness;
      curve.push({ generation, fitness: eliteFitness });

      const checkpoint: OptimizeCheckpoint = {
        version: 1,
        generation,
        elite,
        eliteFitness,
        sigma: config.sigma,
        curve,
        splitHash: split.contentHash,
        rngSalt: config.seed,
      };
      writeFileSync(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
      writeFileSync(
        path.join(config.outDir, `elite-gen-${String(generation)}.json`),
        `${JSON.stringify(elite, null, 2)}\n`,
        'utf8',
      );

      // CLI progress
      console.log(
        `gen ${String(generation)} fitness=${eliteFitness.toFixed(4)} hash=${computePolicyWeightsHash(elite)} gauntlet=${FROZEN_GAUNTLET_POLICY_IDS.join(',')}`,
      );
    }
  } finally {
    if (pool !== undefined) {
      await pool.close();
    }
  }

  writeFileSync(
    path.join(config.outDir, 'elite.json'),
    `${JSON.stringify(elite, null, 2)}\n`,
    'utf8',
  );
  writeFileSync(
    path.join(config.outDir, 'fitness-curve.json'),
    `${JSON.stringify({ gauntlet: FROZEN_GAUNTLET_POLICY_IDS, curve }, null, 2)}\n`,
    'utf8',
  );

  return { elite, eliteFitness, split, curve };
}

async function main(): Promise<void> {
  const config = parseOptimizeArgs(process.argv.slice(2));
  const result = await runOptimize(config);
  // CLI summary
  console.log(
    JSON.stringify(
      {
        eliteFitness: result.eliteFitness,
        eliteHash: computePolicyWeightsHash(result.elite),
        splitHash: result.split.contentHash,
        generations: result.curve.length,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
