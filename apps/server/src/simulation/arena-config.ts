/**
 * Arena CLI config — technical spec v5 §7.2 (L32-06).
 */

import {
  BOT_DIFFICULTIES,
  isBotDifficulty,
  type BotDifficulty,
} from '@card-battle/shared';

import { listPolicyIds } from '../bots/registry';
import {
  listWeightsProfileIds,
  resolveWeightsProfile,
} from '../bots/profiles/index';

export type ArenaKitMode = 'mirrored' | 'random';

export interface ArenaConfig {
  games: number;
  playerCount: number;
  policyA: string;
  policyB: string;
  baseSeed: string;
  difficulty: BotDifficulty;
  kitModes: readonly ArenaKitMode[];
  outPath: string;
  /** Optional checked-in weights profile for both seats (L33-01). */
  weightsProfile: string | null;
  /** Write feature-snapshot JSONL beside games when set (L33-06). */
  featureSnapshotsPath: string | null;
  /**
   * Iteration budget for ISMCTS seats (L36-01 / L40-04). Omitted → policy default
   * (`OFFLINE_SEARCH_ITERATIONS` for `search-v5*`).
   */
  searchIterations?: number;
  /** Override `MAX_TURNS` (L40-04 snapshot collection). Omitted → 2500. */
  maxTurns?: number;
}

const DEFAULT_KIT_MODES: readonly ArenaKitMode[] = ['mirrored', 'random'];

export function parseArenaArgs(argv: readonly string[]): ArenaConfig {
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

  const games = Number.parseInt(requireArg(args, 'games'), 10);
  const playerCount = Number.parseInt(args.get('players') ?? '2', 10);
  const baseSeed = requireArg(args, 'seed');
  const outPath = requireArg(args, 'out');
  const policyA = requireArg(args, 'policy-a');
  const policyB = requireArg(args, 'policy-b');
  const difficultyRaw = args.get('difficulty') ?? 'hard';
  const kitModesRaw = args.get('kit-modes');

  if (!Number.isFinite(games) || games < 1) {
    throw new Error('--games must be a positive integer');
  }

  if (!Number.isFinite(playerCount) || playerCount !== 2) {
    throw new Error('--players must be 2 (seat rotation is defined for 2-player arena)');
  }

  if (!isBotDifficulty(difficultyRaw)) {
    throw new Error(
      `--difficulty must be one of ${BOT_DIFFICULTIES.join(', ')}`,
    );
  }

  const registered = new Set(listPolicyIds());

  if (!registered.has(policyA)) {
    throw new Error(`Unknown --policy-a: ${policyA}`);
  }

  if (!registered.has(policyB)) {
    throw new Error(`Unknown --policy-b: ${policyB}`);
  }

  const kitModes = parseKitModes(kitModesRaw);
  const weightsProfileRaw = args.get('weights-profile');
  const weightsProfile =
    weightsProfileRaw === undefined || weightsProfileRaw === ''
      ? null
      : weightsProfileRaw;

  if (weightsProfile !== null) {
    if (!listWeightsProfileIds().includes(weightsProfile)) {
      throw new Error(`Unknown --weights-profile: ${weightsProfile}`);
    }

    // Ensure the JSON parses.
    resolveWeightsProfile(weightsProfile);
  }

  const featureSnapshotsPath = args.get('feature-snapshots') ?? null;
  const searchIterationsRaw = args.get('search-iterations');
  const searchIterations =
    searchIterationsRaw === undefined || searchIterationsRaw === ''
      ? undefined
      : Number.parseInt(searchIterationsRaw, 10);

  if (searchIterations !== undefined && (!Number.isFinite(searchIterations) || searchIterations < 1)) {
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
    playerCount,
    policyA,
    policyB,
    baseSeed,
    difficulty: difficultyRaw,
    kitModes,
    outPath,
    weightsProfile,
    featureSnapshotsPath: featureSnapshotsPath === '' ? null : featureSnapshotsPath,
    ...(searchIterations !== undefined ? { searchIterations } : {}),
    ...(maxTurns !== undefined ? { maxTurns } : {}),
  };
}

function parseKitModes(raw: string | undefined): readonly ArenaKitMode[] {
  if (raw === undefined || raw === '') {
    return DEFAULT_KIT_MODES;
  }

  const modes = raw.split(',').map((entry) => entry.trim());
  const parsed: ArenaKitMode[] = [];

  for (const mode of modes) {
    if (mode !== 'mirrored' && mode !== 'random') {
      throw new Error('--kit-modes must be a comma-separated list of mirrored and/or random');
    }

    if (!parsed.includes(mode)) {
      parsed.push(mode);
    }
  }

  if (parsed.length === 0) {
    throw new Error('--kit-modes must list at least one mode');
  }

  return parsed;
}

function requireArg(args: ReadonlyMap<string, string>, key: string): string {
  const value = args.get(key);

  if (value === undefined || value === '') {
    throw new Error(`Missing required --${key}`);
  }

  return value;
}
