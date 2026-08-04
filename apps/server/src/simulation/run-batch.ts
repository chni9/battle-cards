/**
 * Headless batch runner CLI — technical spec v3 §8 (L18-04).
 * Usage: pnpm --filter @card-battle/server simulate -- --games N --players 2 \
 *   --difficulties hard,hard --seed batch --out ./out.jsonl [--kits assassin,kamikaze]
 *
 * Does not write Postgres (§8.2).
 * Hard self-play can stall (MAX_TURNS) — those games are skipped and counted, not fatal.
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseBatchArgs } from './batch-config';
import { serializeGameRow } from './emit-row';
import { runSimulatedGame } from './run-game';

export function gameSeed(baseSeed: string, gameIndex: number): string {
  return `${baseSeed}:${String(gameIndex)}`;
}

export function isStallError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('MAX_TURNS');
}

export interface BatchRunResult {
  body: string;
  completed: number;
  stalled: number;
  stalledSeeds: readonly string[];
}

export interface RunBatchOptions {
  /** Test-only: force every game's turn cap (default 2500). */
  maxTurns?: number;
}

export async function runBatch(
  argv: readonly string[],
  options: RunBatchOptions = {},
): Promise<BatchRunResult> {
  const config = parseBatchArgs(argv);
  const lines: string[] = [];
  const stalledSeeds: string[] = [];

  for (let index = 0; index < config.games; index += 1) {
    const seed = gameSeed(config.baseSeed, index);

    try {
      const row = runSimulatedGame({
        seed,
        playerCount: config.playerCount,
        difficulties: config.difficulties,
        ...(config.kitAssignment !== undefined
          ? { kitAssignment: config.kitAssignment }
          : {}),
        ...(options.maxTurns !== undefined ? { maxTurns: options.maxTurns } : {}),
      });
      lines.push(serializeGameRow(row));
    } catch (error) {
      if (isStallError(error)) {
        stalledSeeds.push(seed);
        continue;
      }

      throw error;
    }
  }

  const body = lines.join('');
  await writeFile(config.outPath, body, 'utf8');
  return {
    body,
    completed: lines.length,
    stalled: stalledSeeds.length,
    stalledSeeds,
  };
}

async function main(): Promise<void> {
  try {
    const result = await runBatch(process.argv.slice(2));
    console.log(
      `Wrote ${String(result.completed)} game(s)` +
        (result.stalled > 0
          ? `, skipped ${String(result.stalled)} stall(s) (MAX_TURNS).`
          : '.'),
    );

    if (result.stalled > 0 && result.stalledSeeds.length <= 10) {
      console.log(`Stalled seeds: ${result.stalledSeeds.join(', ')}`);
    } else if (result.stalled > 10) {
      console.log(
        `Stalled seeds (first 10): ${result.stalledSeeds.slice(0, 10).join(', ')}…`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

const isCliEntry =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntry) {
  void main();
}
