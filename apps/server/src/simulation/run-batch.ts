/**
 * Headless batch runner CLI — technical spec v3 §8 (L18-04).
 * Usage: pnpm --filter @card-battle/server simulate -- --games N --players 2 \
 *   --difficulties hard,hard --seed batch --out ./out.jsonl [--kits assassin,kamikaze]
 *
 * Does not write Postgres (§8.2).
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

export async function runBatch(argv: readonly string[]): Promise<string> {
  const config = parseBatchArgs(argv);
  const lines: string[] = [];

  for (let index = 0; index < config.games; index += 1) {
    const row = runSimulatedGame({
      seed: gameSeed(config.baseSeed, index),
      playerCount: config.playerCount,
      difficulties: config.difficulties,
      ...(config.kitAssignment !== undefined
        ? { kitAssignment: config.kitAssignment }
        : {}),
    });
    lines.push(serializeGameRow(row));
  }

  const body = lines.join('');
  await writeFile(config.outPath, body, 'utf8');
  return body;
}

async function main(): Promise<void> {
  try {
    const body = await runBatch(process.argv.slice(2));
    const games = body === '' ? 0 : body.trimEnd().split('\n').length;
    console.log(`Wrote ${String(games)} game(s).`);
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
