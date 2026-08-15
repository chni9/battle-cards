/**
 * Re-execute a published screen from config.json and assert byte-identical JSONL.
 * Technical spec v5 §8.3 / L38-03.
 *
 * Usage:
 *   pnpm --filter @card-battle/server exec tsx src/simulation/verify-screen-determinism.ts -- \
 *     --published docs/simulation/<date>-v5-search
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isKitId } from '@card-battle/shared';

import { runScreen } from './run-screen';
import { REPO_ROOT, parseScreenArgs } from './screen-config';

export interface PublishedScreenConfig {
  readonly baseSeed: string;
  readonly gamesPerCell: number;
  readonly oneVOneKits: readonly string[];
  readonly fourPlayer: {
    readonly mode: 'fixed' | 'random';
    readonly games: number;
    readonly mix?: readonly string[];
  };
  readonly undersampledCardThreshold: number;
  readonly policyId: string;
  readonly weightsProfile: string | null;
  readonly searchIterations: number;
  readonly concurrency: number;
}

export function argvFromPublished(
  published: PublishedScreenConfig,
  outDir: string,
): readonly string[] {
  const kits = published.oneVOneKits;

  for (const [index, kit] of kits.entries()) {
    if (!isKitId(kit)) {
      throw new Error(`published oneVOneKits[${String(index)}] is not a KitId`);
    }
  }

  const argv: string[] = [
    '--seed',
    published.baseSeed,
    '--games-per-cell',
    String(published.gamesPerCell),
    '--kits',
    kits.join(','),
    '--out',
    outDir,
    '--four-player-mode',
    published.fourPlayer.mode,
    '--four-player-games',
    String(published.fourPlayer.games),
    '--undersampled-card-threshold',
    String(published.undersampledCardThreshold),
    '--policy',
    published.policyId,
    '--search-iterations',
    String(published.searchIterations),
    '--concurrency',
    String(published.concurrency),
  ];

  if (published.weightsProfile !== null) {
    argv.push('--weights-profile', published.weightsProfile);
  }

  if (published.fourPlayer.mode === 'fixed') {
    const mix = published.fourPlayer.mix;

    if (mix?.length !== 4) {
      throw new Error('published fixed fourPlayer requires mix of 4 kits');
    }

    for (const [index, kit] of mix.entries()) {
      if (!isKitId(kit)) {
        throw new Error(`published fourPlayer.mix[${String(index)}] is not a KitId`);
      }
    }

    argv.push('--four-player-mix', mix.join(','));
  }

  return argv;
}

function parsePublished(raw: unknown): PublishedScreenConfig {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('published config.json must be an object');
  }

  const record = raw as Record<string, unknown>;
  const fourPlayerRaw = record['fourPlayer'];

  if (fourPlayerRaw === null || typeof fourPlayerRaw !== 'object') {
    throw new Error('published fourPlayer missing');
  }

  const fourPlayer = fourPlayerRaw as Record<string, unknown>;
  const mixRaw = fourPlayer['mix'];

  return {
    baseSeed: requireString(record, 'baseSeed'),
    gamesPerCell: requirePositiveInt(record, 'gamesPerCell'),
    oneVOneKits: requireStringArray(record, 'oneVOneKits'),
    fourPlayer: {
      mode: parseFourMode(fourPlayer['mode']),
      games: requirePositiveInt(fourPlayer, 'games'),
      ...(Array.isArray(mixRaw)
        ? { mix: mixRaw.map((entry) => String(entry)) }
        : {}),
    },
    undersampledCardThreshold: requirePositiveInt(record, 'undersampledCardThreshold'),
    policyId: requireString(record, 'policyId'),
    weightsProfile: typeof record['weightsProfile'] === 'string' ? record['weightsProfile'] : null,
    searchIterations: requirePositiveInt(record, 'searchIterations'),
    concurrency: requirePositiveInt(record, 'concurrency'),
  };
}

function parseFourMode(raw: unknown): 'fixed' | 'random' {
  if (raw === 'fixed' || raw === 'random') {
    return raw;
  }

  throw new Error('published fourPlayer.mode must be fixed or random');
}

function requireString(record: Readonly<Record<string, unknown>>, key: string): string {
  const value = record[key];

  if (typeof value !== 'string' || value === '') {
    throw new Error(`published ${key} must be a non-empty string`);
  }

  return value;
}

function requirePositiveInt(record: Readonly<Record<string, unknown>>, key: string): number {
  const value = record[key];

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`published ${key} must be a positive integer`);
  }

  return value;
}

function requireStringArray(
  record: Readonly<Record<string, unknown>>,
  key: string,
): readonly string[] {
  const value = record[key];

  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`published ${key} must be a non-empty array`);
  }

  return value.map((entry) => String(entry));
}

export async function verifyPublishedScreen(publishedDir: string): Promise<void> {
  const resolved = path.isAbsolute(publishedDir)
    ? publishedDir
    : path.resolve(REPO_ROOT, publishedDir);
  const publishedRaw: unknown = JSON.parse(
    await readFile(path.join(resolved, 'config.json'), 'utf8'),
  );
  const published = parsePublished(publishedRaw);
  const expectedJsonl = await readFile(path.join(resolved, 'games.jsonl'));
  const expectedAggregates = await readFile(path.join(resolved, 'aggregates.json'));
  const tmp = await mkdtemp(path.join(tmpdir(), 'card-battle-screen-verify-'));

  try {
    const config = parseScreenArgs(argvFromPublished(published, tmp));
    await runScreen(config, { quiet: true });
    const actualJsonl = await readFile(path.join(tmp, 'games.jsonl'));
    const actualAggregates = await readFile(path.join(tmp, 'aggregates.json'));

    if (!actualJsonl.equals(expectedJsonl)) {
      throw new Error(`games.jsonl is not byte-identical to ${resolved}`);
    }

    if (!actualAggregates.equals(expectedAggregates)) {
      throw new Error(`aggregates.json is not byte-identical to ${resolved}`);
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf('--published');
  const published = flagIndex >= 0 ? args[flagIndex + 1] : undefined;

  if (published === undefined || published === '') {
    throw new Error('Missing --published <dir>');
  }

  await verifyPublishedScreen(published);
  console.log(`byte-identical replay: ${published}`);
}

const isCliEntry =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntry) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
