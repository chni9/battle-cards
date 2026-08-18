/**
 * Gross-imbalance screen config — technical spec v4 §7 / Lot 31 / v5 §5.2 (L38-01).
 */

import { availableParallelism } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isKitId, KIT_IDS, type KitId } from '@card-battle/shared';

import { usesOfflineSearchBudget } from '../bots/policies/search-v5';
import { listWeightsProfileIds, resolveWeightsProfile } from '../bots/profiles/index';
import { DEFAULT_POLICY_ID, listPolicyIds } from '../bots/registry';
import { OFFLINE_SEARCH_ITERATIONS } from '../bots/search/search-budget';

/** Monorepo root — `pnpm --filter` runs with cwd `apps/server`. */
export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../',
);

/** Four kits measured by the V3 gross-imbalance screen (L18-05 / L31-01). */
export const ORIGINAL_V3_KIT_IDS = [
  'untouchable',
  'kamikaze',
  'scientific',
  'assassin',
] as const satisfies readonly KitId[];

export type OriginalV3KitId = (typeof ORIGINAL_V3_KIT_IDS)[number];

export type FourPlayerMode = 'fixed' | 'random';

export interface FourPlayerConfig {
  mode: FourPlayerMode;
  games: number;
  /** Required when `mode === 'fixed'`; ignored for `random`. */
  mix?: readonly [KitId, KitId, KitId, KitId];
}

export interface ScreenConfig {
  baseSeed: string;
  gamesPerCell: number;
  difficulty: 'hard';
  oneVOneKits: readonly KitId[];
  fourPlayer: FourPlayerConfig;
  outDir: string;
  /** Games in which a card must appear before it counts as measured (L31-04). */
  undersampledCardThreshold: number;
  coverageNote: string;
  /** Registry policy id for every seat (L38-01). */
  policyId: string;
  /** Arena-style profile override; `null` uses the policy's closed-over weights. */
  weightsProfile: string | null;
  /** Offline search iterations (tech spec v5 §8.2). `1` for sync policies. */
  searchIterations: number;
  /** Parallelism across games only — never inside one search tree (§8.3). */
  concurrency: number;
}

/** V4 published matrix — log if a run is smaller (L38-01 silent-cap watch). */
export const V4_SCREEN_KIT_COUNT = 15;
export const V4_SCREEN_GAMES_PER_CELL = 200;
export const V4_SCREEN_FOUR_PLAYER_GAMES = 2000;

const DEFAULT_GAMES_PER_CELL = 200;
const DEFAULT_FOUR_PLAYER_GAMES = 2000;
const DEFAULT_UNDER_SAMPLED = 100;
const DEFAULT_SEED = 'gross-imbalance-v4';
const DEFAULT_OUT = path.join(REPO_ROOT, 'docs/simulation/v4-content');

function resolveOutDir(raw: string | undefined): string {
  if (raw === undefined || raw === '') {
    return DEFAULT_OUT;
  }

  return path.isAbsolute(raw) ? raw : path.resolve(REPO_ROOT, raw);
}

export function unorderedPairs(kits: readonly KitId[]): readonly [KitId, KitId][] {
  const pairs: [KitId, KitId][] = [];

  for (let i = 0; i < kits.length; i += 1) {
    for (let j = i + 1; j < kits.length; j += 1) {
      const left = kits[i];
      const right = kits[j];

      if (left !== undefined && right !== undefined) {
        pairs.push([left, right]);
      }
    }
  }

  return pairs;
}

export function matchupId(kitA: KitId, kitB: KitId): string {
  const sorted = [kitA, kitB].sort() as [KitId, KitId];
  return `${sorted[0]}_vs_${sorted[1]}`;
}

export function coverageDroppedVsV4(
  config: Pick<ScreenConfig, 'oneVOneKits' | 'gamesPerCell' | 'fourPlayer'>,
): string | null {
  const kitDrop = config.oneVOneKits.length < V4_SCREEN_KIT_COUNT;
  const cellDrop = config.gamesPerCell < V4_SCREEN_GAMES_PER_CELL;
  const fourDrop =
    config.fourPlayer.mode === 'random' &&
    config.fourPlayer.games < V4_SCREEN_FOUR_PLAYER_GAMES;

  if (!kitDrop && !cellDrop && !fourDrop) {
    return null;
  }

  return [
    'Coverage dropped relative to V4 screen',
    `(kits ${String(config.oneVOneKits.length)}/${String(V4_SCREEN_KIT_COUNT)},`,
    `gamesPerCell ${String(config.gamesPerCell)}/${String(V4_SCREEN_GAMES_PER_CELL)},`,
    `4p ${String(config.fourPlayer.games)}/${String(V4_SCREEN_FOUR_PLAYER_GAMES)}).`,
  ].join(' ');
}

export function buildCoverageNote(config: Omit<ScreenConfig, 'coverageNote'>): string {
  const pairCount = unorderedPairs(config.oneVOneKits).length;
  const four =
    config.fourPlayer.mode === 'random'
      ? `4p: ${String(config.fourPlayer.games)} random-with-replacement games (omit kitAssignment; production path). Not exhaustive over C(n,4).`
      : `4p: ${String(config.fourPlayer.games)} games with fixed mix [${(config.fourPlayer.mix ?? []).join(', ')}].`;
  const drop = coverageDroppedVsV4(config);

  return [
    `1v1: ${String(pairCount)} unordered pairs × ${String(config.gamesPerCell)} games (full matrix; nothing dropped).`,
    four,
    `Undersampled card threshold N=${String(config.undersampledCardThreshold)}.`,
    `Policy ${config.policyId}; searchIterations ${String(config.searchIterations)}.`,
    'Difficulty sweeps deferred. Stalls counted separately (never assigned a winner).',
    ...(drop !== null ? [drop] : []),
  ].join(' ');
}

export function parseScreenArgs(argv: readonly string[]): ScreenConfig {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--' || token?.startsWith('--') !== true) {
      continue;
    }

    const key = token.slice(2);

    if (key === '') {
      continue;
    }

    const value = argv[index + 1];

    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    args.set(key, value);
    index += 1;
  }

  const gamesPerCell = parsePositiveInt(
    args.get('games-per-cell') ?? String(DEFAULT_GAMES_PER_CELL),
    'games-per-cell',
  );
  const fourPlayerGames = parsePositiveInt(
    args.get('four-player-games') ?? String(DEFAULT_FOUR_PLAYER_GAMES),
    'four-player-games',
  );
  const undersampledCardThreshold = parsePositiveInt(
    args.get('undersampled-card-threshold') ?? String(DEFAULT_UNDER_SAMPLED),
    'undersampled-card-threshold',
  );
  const baseSeed = args.get('seed') ?? DEFAULT_SEED;
  const outDir = resolveOutDir(args.get('out'));
  const fourPlayerMode = parseFourPlayerMode(args.get('four-player-mode') ?? 'random');
  const oneVOneKits = parseKitList(args.get('kits'), KIT_IDS);

  let mix: FourPlayerConfig['mix'];

  if (fourPlayerMode === 'fixed') {
    const mixRaw = args.get('four-player-mix');

    if (mixRaw === undefined || mixRaw === '') {
      if (oneVOneKits.length === 4) {
        mix = asFourKits(oneVOneKits);
      } else {
        throw new Error(
          '--four-player-mode fixed requires --four-player-mix with exactly 4 kit ids (or --kits with exactly 4)',
        );
      }
    } else {
      mix = parseFixedMix(mixRaw);
    }
  }

  const policyId = parsePolicyId(args.get('policy'));
  const weightsProfile = parseWeightsProfile(args.get('weights-profile'));
  const searchIterations = parseSearchIterations(
    args.get('search-iterations'),
    policyId,
  );
  const concurrency = parseConcurrency(args.get('concurrency'));

  const partial = {
    baseSeed,
    gamesPerCell,
    difficulty: 'hard' as const,
    oneVOneKits,
    fourPlayer: {
      mode: fourPlayerMode,
      games: fourPlayerGames,
      ...(mix !== undefined ? { mix } : {}),
    },
    outDir,
    undersampledCardThreshold,
    policyId,
    weightsProfile,
    searchIterations,
    concurrency,
  };

  return {
    ...partial,
    coverageNote: buildCoverageNote(partial),
  };
}

function parsePolicyId(raw: string | undefined): string {
  const policyId = raw === undefined || raw === '' ? DEFAULT_POLICY_ID : raw;
  const registered = listPolicyIds();

  if (!registered.includes(policyId)) {
    throw new Error(`Unknown --policy: ${policyId}`);
  }

  return policyId;
}

function parseWeightsProfile(raw: string | undefined): string | null {
  if (raw === undefined || raw === '') {
    return null;
  }

  if (!listWeightsProfileIds().includes(raw)) {
    throw new Error(`Unknown --weights-profile: ${raw}`);
  }

  resolveWeightsProfile(raw);
  return raw;
}

function parseSearchIterations(raw: string | undefined, policyId: string): number {
  if (raw === undefined || raw === '') {
    return usesOfflineSearchBudget(policyId) ? OFFLINE_SEARCH_ITERATIONS : 1;
  }

  return parsePositiveInt(raw, 'search-iterations');
}

function parseConcurrency(raw: string | undefined): number {
  if (raw !== undefined && raw !== '') {
    return parsePositiveInt(raw, 'concurrency');
  }

  if (process.env['VITEST'] !== undefined) {
    return 1;
  }

  return Math.max(1, Math.min(availableParallelism() - 1, 8));
}

function parseFourPlayerMode(raw: string): FourPlayerMode {
  if (raw === 'fixed' || raw === 'random') {
    return raw;
  }

  throw new Error('--four-player-mode must be fixed or random');
}

function parseKitList(
  raw: string | undefined,
  fallback: readonly KitId[],
): readonly KitId[] {
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const kits = raw.split(',');

  if (kits.length < 2) {
    throw new Error('--kits must list at least 2 kit ids');
  }

  const seen = new Set<KitId>();
  const parsed: KitId[] = [];

  for (const [index, entry] of kits.entries()) {
    if (!isKitId(entry)) {
      throw new Error(`--kits[${String(index)}] is not a KitId`);
    }

    if (seen.has(entry)) {
      throw new Error(`--kits duplicates ${entry}`);
    }

    seen.add(entry);
    parsed.push(entry);
  }

  return parsed;
}

function parseFixedMix(raw: string): readonly [KitId, KitId, KitId, KitId] {
  const kits = raw.split(',');

  if (kits.length !== 4) {
    throw new Error('--four-player-mix must list exactly 4 kit ids');
  }

  const parsed: KitId[] = [];

  for (const [index, entry] of kits.entries()) {
    if (!isKitId(entry)) {
      throw new Error(`--four-player-mix[${String(index)}] is not a KitId`);
    }

    parsed.push(entry);
  }

  return asFourKits(parsed);
}

function asFourKits(
  kits: readonly KitId[],
): readonly [KitId, KitId, KitId, KitId] {
  const a = kits[0];
  const b = kits[1];
  const c = kits[2];
  const d = kits[3];

  if (a === undefined || b === undefined || c === undefined || d === undefined) {
    throw new Error('expected exactly 4 kit ids');
  }

  return [a, b, c, d];
}

function parsePositiveInt(raw: string, flag: string): number {
  const value = Number.parseInt(raw, 10);

  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`--${flag} must be a positive integer`);
  }

  return value;
}
