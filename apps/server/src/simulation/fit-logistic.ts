/**
 * Fit L2-regularized logistic regression for Lot 37 — backlog L37-02.
 * Pure TypeScript; exports plain JSON for `bots/eval/fitted.ts`.
 *
 * Usage:
 *   pnpm --filter @card-battle/server fit:logistic -- \
 *     --dataset ../../docs/simulation/.../dataset \
 *     --out ../../apps/server/src/bots/eval/models/logistic-v5.json \
 *     --report ../../docs/simulation/.../calibration.json \
 *     --policy-id search-v5 --games-approx 100
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  computeFittedModelContentHash,
  type FittedLogisticModel,
  logitFromFeatures,
  parseFittedModel,
} from '../bots/eval/fitted';
import { FEATURE_DIM, FEATURE_LAYOUT_VERSION } from '../bots/eval/features';
import type { LabeledFittedRow } from './assemble-fitted-dataset';

interface FitConfig {
  readonly datasetDir: string;
  readonly outPath: string;
  readonly reportPath: string;
  readonly policyId: string;
  readonly gamesApprox: number;
  readonly seed: string;
  readonly maxEpochs: number;
  readonly learningRate: number;
}

function parseArgs(argv: readonly string[]): FitConfig {
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

  const datasetDir = args.get('dataset');
  const outPath = args.get('out');
  const reportPath = args.get('report');

  if (datasetDir === undefined || outPath === undefined || reportPath === undefined) {
    throw new Error(
      'Usage: fit:logistic -- --dataset <dir> --out <model.json> --report <calibration.json> [--policy-id search-v5] [--games-approx N]',
    );
  }

  return {
    datasetDir,
    outPath,
    reportPath,
    policyId: args.get('policy-id') ?? 'search-v5',
    gamesApprox: Number.parseInt(args.get('games-approx') ?? '0', 10),
    seed: args.get('seed') ?? 'l37-02-fit',
    maxEpochs: Number.parseInt(args.get('epochs') ?? '200', 10),
    learningRate: Number.parseFloat(args.get('lr') ?? '0.05'),
  };
}

function readSplit(path: string): LabeledFittedRow[] {
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  return lines.map((line) => JSON.parse(line) as LabeledFittedRow);
}

function sigmoid(logit: number): number {
  if (logit >= 0) {
    const z = Math.exp(-logit);
    return 1 / (1 + z);
  }

  const z = Math.exp(logit);
  return z / (1 + z);
}

/** Mulberry32 from seed string — deterministic shuffle / init. */
function rngFromSeed(seed: string): () => number {
  let state = 0;

  for (let index = 0; index < seed.length; index += 1) {
    state = (Math.imul(31, state) + seed.charCodeAt(index)) | 0;
  }

  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fitLogisticL2(input: {
  readonly train: readonly LabeledFittedRow[];
  readonly validation: readonly LabeledFittedRow[];
  readonly lambdas: readonly number[];
  readonly learningRate: number;
  readonly maxEpochs: number;
  readonly seed: string;
}): {
  readonly intercept: number;
  readonly weights: number[];
  readonly lambda: number;
  readonly trainLogLoss: number;
  readonly validationLogLoss: number;
} {
  const rng = rngFromSeed(input.seed);
  let best:
    | {
        intercept: number;
        weights: number[];
        lambda: number;
        trainLogLoss: number;
        validationLogLoss: number;
      }
    | undefined;

  for (const lambda of input.lambdas) {
    const weights = Array.from({ length: FEATURE_DIM }, () => (rng() - 0.5) * 0.01);
    let intercept = 0;

    for (let epoch = 0; epoch < input.maxEpochs; epoch += 1) {
      const order = input.train.map((_, index) => index);

      for (let index = order.length - 1; index > 0; index -= 1) {
        const j = Math.floor(rng() * (index + 1));
        const left = order[index];
        const right = order[j];

        if (left === undefined || right === undefined) {
          continue;
        }

        order[index] = right;
        order[j] = left;
      }

      for (const rowIndex of order) {
        const row = input.train[rowIndex];

        if (row === undefined) {
          continue;
        }

        const logit =
          intercept +
          row.features.reduce(
            (sum, value, featureIndex) => sum + value * (weights[featureIndex] ?? 0),
            0,
          );
        const pred = sigmoid(logit);
        const error = pred - row.label;
        intercept -= input.learningRate * error;

        for (let featureIndex = 0; featureIndex < FEATURE_DIM; featureIndex += 1) {
          const feature = row.features[featureIndex] ?? 0;
          const grad = error * feature + lambda * (weights[featureIndex] ?? 0);
          weights[featureIndex] = (weights[featureIndex] ?? 0) - input.learningRate * grad;
        }
      }
    }

    const trainLogLoss = meanLogLoss(input.train, intercept, weights);
    const validationLogLoss = meanLogLoss(input.validation, intercept, weights);
    const candidate = {
      intercept,
      weights: [...weights],
      lambda,
      trainLogLoss,
      validationLogLoss,
    };

    if (
      best === undefined ||
      candidate.validationLogLoss < best.validationLogLoss
    ) {
      best = candidate;
    }
  }

  if (best === undefined) {
    throw new Error('No lambda produced a model');
  }

  return best;
}

export function meanLogLoss(
  rows: readonly LabeledFittedRow[],
  intercept: number,
  weights: readonly number[],
): number {
  if (rows.length === 0) {
    return 0;
  }

  let total = 0;

  for (const row of rows) {
    const logit =
      intercept +
      row.features.reduce(
        (sum, value, featureIndex) => sum + value * (weights[featureIndex] ?? 0),
        0,
      );
    const pred = Math.min(1 - 1e-12, Math.max(1e-12, sigmoid(logit)));
    total +=
      row.label === 1 ? -Math.log(pred) : -Math.log(1 - pred);
  }

  return total / rows.length;
}

export function meanBrier(
  rows: readonly LabeledFittedRow[],
  intercept: number,
  weights: readonly number[],
): number {
  if (rows.length === 0) {
    return 0;
  }

  let total = 0;

  for (const row of rows) {
    const logit =
      intercept +
      row.features.reduce(
        (sum, value, featureIndex) => sum + value * (weights[featureIndex] ?? 0),
        0,
      );
    const pred = sigmoid(logit);
    total += (pred - row.label) ** 2;
  }

  return total / rows.length;
}

/** Reliability bins for calibration curve. */
export function calibrationCurve(
  rows: readonly LabeledFittedRow[],
  intercept: number,
  weights: readonly number[],
  binCount = 10,
): readonly {
  readonly bin: number;
  readonly count: number;
  readonly meanPred: number;
  readonly meanLabel: number;
}[] {
  const bins = Array.from({ length: binCount }, (_, bin) => ({
    bin,
    count: 0,
    sumPred: 0,
    sumLabel: 0,
  }));

  for (const row of rows) {
    const logit =
      intercept +
      row.features.reduce(
        (sum, value, featureIndex) => sum + value * (weights[featureIndex] ?? 0),
        0,
      );
    const pred = sigmoid(logit);
    const bin = Math.min(binCount - 1, Math.floor(pred * binCount));
    const entry = bins[bin];

    if (entry === undefined) {
      continue;
    }

    entry.count += 1;
    entry.sumPred += pred;
    entry.sumLabel += row.label;
  }

  return bins.map((entry) => ({
    bin: entry.bin,
    count: entry.count,
    meanPred: entry.count === 0 ? 0 : entry.sumPred / entry.count,
    meanLabel: entry.count === 0 ? 0 : entry.sumLabel / entry.count,
  }));
}

function main(): void {
  const config = parseArgs(process.argv.slice(2));
  const train = readSplit(join(config.datasetDir, 'train.jsonl'));
  const validation = readSplit(join(config.datasetDir, 'validation.jsonl'));
  const test = readSplit(join(config.datasetDir, 'test.jsonl'));
  const manifest = JSON.parse(
    readFileSync(join(config.datasetDir, 'manifest.json'), 'utf8'),
  ) as { contentHash: string };

  if (train.length === 0) {
    throw new Error('train.jsonl is empty');
  }

  const fit = fitLogisticL2({
    train,
    validation: validation.length > 0 ? validation : train,
    lambdas: [1e-4, 1e-3, 1e-2, 1e-1],
    learningRate: config.learningRate,
    maxEpochs: config.maxEpochs,
    seed: config.seed,
  });

  const createdAt = new Date().toISOString().slice(0, 10);
  const withoutHash = {
    kind: 'logistic' as const,
    featureLayoutVersion: FEATURE_LAYOUT_VERSION,
    featureDim: FEATURE_DIM,
    intercept: fit.intercept,
    weights: fit.weights,
    trainedOn: {
      datasetManifestHash: manifest.contentHash,
      policyId: config.policyId,
      gamesApprox: config.gamesApprox,
      createdAt,
    },
  };
  const model: FittedLogisticModel = {
    ...withoutHash,
    contentHash: computeFittedModelContentHash(withoutHash),
  };

  // Round-trip through parser (layout + hash check).
  parseFittedModel(model);

  mkdirSync(dirname(config.outPath), { recursive: true });
  writeFileSync(config.outPath, `${JSON.stringify(model, null, 2)}\n`, 'utf8');

  const testLogLoss = meanLogLoss(test, fit.intercept, fit.weights);
  const testBrier = meanBrier(test, fit.intercept, fit.weights);
  const report = {
    lambda: fit.lambda,
    trainLogLoss: fit.trainLogLoss,
    validationLogLoss: fit.validationLogLoss,
    testLogLoss,
    testBrier,
    calibrationVal: calibrationCurve(validation.length > 0 ? validation : train, fit.intercept, fit.weights),
    calibrationTest: calibrationCurve(test.length > 0 ? test : train, fit.intercept, fit.weights),
    modelContentHash: model.contentHash,
    featureLayoutVersion: FEATURE_LAYOUT_VERSION,
    inferenceParityMaxAbsError: maxParityError(test.length > 0 ? test : train, model),
  };

  mkdirSync(dirname(config.reportPath), { recursive: true });
  writeFileSync(config.reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

function maxParityError(rows: readonly LabeledFittedRow[], model: FittedLogisticModel): number {
  let maxAbs = 0;

  for (const row of rows) {
    const features = Float64Array.from(row.features);
    const fromModel = logitFromFeatures(model, features);
    const manual =
      model.intercept +
      row.features.reduce(
        (sum, value, index) => sum + value * (model.weights[index] ?? 0),
        0,
      );
    maxAbs = Math.max(maxAbs, Math.abs(fromModel - manual));
  }

  return maxAbs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}
