/**
 * Assemble Lot 37 training splits from feature-snapshot JSONL — backlog L37-01.
 * Split by seed (never by row). Stalled games already contribute zero rows upstream.
 *
 * Usage:
 *   pnpm --filter @card-battle/server fit:assemble -- \
 *     --in features.jsonl --out ../../docs/simulation/2026-08-13-v5-fitted/dataset \
 *     --seed l37-01-split
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FEATURE_DIM,
  FEATURE_LAYOUT_VERSION,
} from '../bots/eval/features';
import { stableStringify } from '../bots/weights-hash';
import type { FeatureSnapshotRow } from './feature-snapshots';

export type FittedSplitName = 'train' | 'validation' | 'test';

export interface LabeledFittedRow {
  readonly seed: string;
  readonly turnSequence: number;
  readonly actingPlayerId: string;
  readonly features: readonly number[];
  readonly featureLayoutVersion: number;
  readonly winnerPlayerId: string;
  /** 1 if acting player eventually won, else 0. */
  readonly label: 0 | 1;
  readonly split: FittedSplitName;
}

export interface FittedDatasetManifest {
  readonly version: 1;
  readonly splitSeed: string;
  readonly featureLayoutVersion: number;
  readonly featureDim: number;
  readonly trainSeeds: readonly string[];
  readonly validationSeeds: readonly string[];
  readonly testSeeds: readonly string[];
  readonly rowCounts: {
    readonly train: number;
    readonly validation: number;
    readonly test: number;
    readonly total: number;
  };
  readonly positiveRates: {
    readonly train: number;
    readonly validation: number;
    readonly test: number;
  };
  readonly contentHash: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseFeatureSnapshotLine(line: string): FeatureSnapshotRow {
  const raw: unknown = JSON.parse(line);

  if (!isPlainObject(raw)) {
    throw new Error('Feature snapshot row must be an object');
  }

  const seed = raw['seed'];
  const turnSequence = raw['turnSequence'];
  const actingPlayerId = raw['actingPlayerId'];
  const features = raw['features'];
  const featureLayoutVersion = raw['featureLayoutVersion'];
  const winnerPlayerId = raw['winnerPlayerId'];

  if (typeof seed !== 'string' || seed === '') {
    throw new Error('Feature snapshot missing seed');
  }

  if (typeof turnSequence !== 'number' || !Number.isFinite(turnSequence)) {
    throw new Error(`Feature snapshot ${seed}: bad turnSequence`);
  }

  if (typeof actingPlayerId !== 'string' || actingPlayerId === '') {
    throw new Error(`Feature snapshot ${seed}: bad actingPlayerId`);
  }

  if (typeof winnerPlayerId !== 'string' || winnerPlayerId === '') {
    throw new Error(`Feature snapshot ${seed}: missing winner (stall rows must be absent)`);
  }

  if (typeof featureLayoutVersion !== 'number') {
    throw new Error(`Feature snapshot ${seed}: bad featureLayoutVersion`);
  }

  if (featureLayoutVersion !== FEATURE_LAYOUT_VERSION) {
    throw new Error(
      `Feature snapshot ${seed}: layout ${String(featureLayoutVersion)} ≠ ${String(FEATURE_LAYOUT_VERSION)}`,
    );
  }

  if (
    !Array.isArray(features) ||
    !features.every((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
  ) {
    throw new Error(`Feature snapshot ${seed}: features must be finite numbers`);
  }

  if (features.length !== FEATURE_DIM) {
    throw new Error(
      `Feature snapshot ${seed}: feature length ${String(features.length)} ≠ ${String(FEATURE_DIM)}`,
    );
  }

  return {
    seed,
    turnSequence,
    actingPlayerId,
    features,
    featureLayoutVersion,
    winnerPlayerId,
  };
}

export function readFeatureSnapshotJsonl(path: string): FeatureSnapshotRow[] {
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  return lines.map(parseFeatureSnapshotLine);
}

/** Deterministic 70/15/15 assignment from splitSeed + game seed. */
export function assignSeedSplit(gameSeed: string, splitSeed: string): FittedSplitName {
  const digest = createHash('sha256')
    .update(`${splitSeed}\0${gameSeed}`)
    .digest();
  const firstByte = digest.at(0) ?? 0;
  const bucket = firstByte / 256;

  if (bucket < 0.7) {
    return 'train';
  }

  if (bucket < 0.85) {
    return 'validation';
  }

  return 'test';
}

export function assembleFittedDataset(input: {
  readonly rows: readonly FeatureSnapshotRow[];
  readonly splitSeed: string;
}): {
  readonly labeled: readonly LabeledFittedRow[];
  readonly manifest: FittedDatasetManifest;
} {
  const splitBySeed = new Map<string, FittedSplitName>();

  for (const row of input.rows) {
    const existing = splitBySeed.get(row.seed);

    if (existing === undefined) {
      splitBySeed.set(row.seed, assignSeedSplit(row.seed, input.splitSeed));
    }
  }

  const labeled: LabeledFittedRow[] = input.rows.map((row) => {
    const split = splitBySeed.get(row.seed);

    if (split === undefined) {
      throw new Error(`Missing split for seed ${row.seed}`);
    }

    return {
      ...row,
      label: row.actingPlayerId === row.winnerPlayerId ? 1 : 0,
      split,
    };
  });

  const trainSeeds = [...splitBySeed.entries()]
    .filter(([, split]) => split === 'train')
    .map(([seed]) => seed)
    .sort();
  const validationSeeds = [...splitBySeed.entries()]
    .filter(([, split]) => split === 'validation')
    .map(([seed]) => seed)
    .sort();
  const testSeeds = [...splitBySeed.entries()]
    .filter(([, split]) => split === 'test')
    .map(([seed]) => seed)
    .sort();

  const count = (name: FittedSplitName): number =>
    labeled.filter((row) => row.split === name).length;
  const positiveRate = (name: FittedSplitName): number => {
    const subset = labeled.filter((row) => row.split === name);
    if (subset.length === 0) return 0;
    return subset.filter((row) => row.label === 1).length / subset.length;
  };

  const train = count('train');
  const validation = count('validation');
  const test = count('test');

  const manifestBody = {
    version: 1 as const,
    splitSeed: input.splitSeed,
    featureLayoutVersion: FEATURE_LAYOUT_VERSION,
    featureDim: FEATURE_DIM,
    trainSeeds,
    validationSeeds,
    testSeeds,
    rowCounts: {
      train,
      validation,
      test,
      total: labeled.length,
    },
    positiveRates: {
      train: positiveRate('train'),
      validation: positiveRate('validation'),
      test: positiveRate('test'),
    },
  };

  const contentHash = createHash('sha256')
    .update(stableStringify(manifestBody))
    .digest('hex')
    .slice(0, 16);

  return {
    labeled,
    manifest: { ...manifestBody, contentHash },
  };
}

export function writeFittedDataset(
  outDir: string,
  labeled: readonly LabeledFittedRow[],
  manifest: FittedDatasetManifest,
): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  for (const split of ['train', 'validation', 'test'] as const) {
    const lines = labeled
      .filter((row) => row.split === split)
      .map((row) => `${JSON.stringify(row)}\n`)
      .join('');
    writeFileSync(join(outDir, `${split}.jsonl`), lines, 'utf8');
  }
}

function parseArgs(argv: readonly string[]): {
  readonly inPath: string;
  readonly outDir: string;
  readonly splitSeed: string;
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

  const inPath = args.get('in');
  const outDir = args.get('out');

  if (inPath === undefined || outDir === undefined) {
    throw new Error('Usage: fit:assemble -- --in <features.jsonl> --out <dir> [--seed <splitSeed>]');
  }

  return {
    inPath,
    outDir,
    splitSeed: args.get('seed') ?? 'l37-01-split',
  };
}

function main(): void {
  const config = parseArgs(process.argv.slice(2));
  const rows = readFeatureSnapshotJsonl(config.inPath);
  const { labeled, manifest } = assembleFittedDataset({
    rows,
    splitSeed: config.splitSeed,
  });
  writeFittedDataset(config.outDir, labeled, manifest);
  console.log(JSON.stringify(manifest, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}
