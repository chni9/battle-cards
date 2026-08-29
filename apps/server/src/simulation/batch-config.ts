/**
 * Batch CLI config — technical spec v3 §8 (L18-04).
 */

import {
  BOT_DIFFICULTIES,
  isBotDifficulty,
  isKitId,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type BotDifficulty,
  type KitId,
} from '@card-battle/shared';

export interface BatchConfig {
  games: number;
  playerCount: number;
  difficulties: readonly BotDifficulty[];
  baseSeed: string;
  kitAssignment: readonly KitId[] | undefined;
  outPath: string;
}

export function parseBatchArgs(argv: readonly string[]): BatchConfig {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    // pnpm forwards a bare `--` before script args; ignore it.
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
  const playerCount = Number.parseInt(requireArg(args, 'players'), 10);
  const baseSeed = requireArg(args, 'seed');
  const outPath = requireArg(args, 'out');
  const difficultiesRaw = requireArg(args, 'difficulties').split(',');
  const kitsRaw = args.get('kits');

  if (!Number.isFinite(games) || games < 1) {
    throw new Error('--games must be a positive integer');
  }

  if (
    !Number.isFinite(playerCount) ||
    playerCount < MIN_PLAYERS ||
    playerCount > MAX_PLAYERS
  ) {
    throw new Error(`--players must be ${String(MIN_PLAYERS)}–${String(MAX_PLAYERS)}`);
  }

  if (difficultiesRaw.length !== playerCount) {
    throw new Error(`--difficulties must list ${String(playerCount)} values`);
  }

  const difficulties: BotDifficulty[] = difficultiesRaw.map((entry, index) => {
    if (!isBotDifficulty(entry)) {
      throw new Error(
        `--difficulties[${String(index)}] must be one of ${BOT_DIFFICULTIES.join(', ')}`,
      );
    }

    return entry;
  });

  let kitAssignment: readonly KitId[] | undefined;

  if (kitsRaw !== undefined) {
    const kits = kitsRaw.split(',');

    if (kits.length !== playerCount) {
      throw new Error(`--kits must list ${String(playerCount)} kit ids`);
    }

    kitAssignment = kits.map((entry, index) => {
      if (!isKitId(entry)) {
        throw new Error(`--kits[${String(index)}] is not a KitId`);
      }

      return entry;
    });
  }

  return {
    games,
    playerCount,
    difficulties,
    baseSeed,
    kitAssignment,
    outPath,
  };
}

function requireArg(args: ReadonlyMap<string, string>, key: string): string {
  const value = args.get(key);

  if (value === undefined || value === '') {
    throw new Error(`Missing required --${key}`);
  }

  return value;
}
