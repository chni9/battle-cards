/**
 * Gross-imbalance screen CLI — technical spec v3 §8.3 / v4 §7 (Lot 31).
 *
 * Usage:
 *   pnpm --filter @card-battle/server exec tsx src/simulation/run-gross-imbalance.ts -- \
 *     --seed … --out … --kits … --games-per-cell 200 \
 *     --four-player-mode fixed|random --four-player-games N \
 *     [--four-player-mix a,b,c,d] \
 *     [--policy search-v5] [--weights-profile id] [--search-iterations 64] \
 *     [--concurrency N]
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runScreen } from './run-screen';
import { parseScreenArgs } from './screen-config';

async function main(): Promise<void> {
  const config = parseScreenArgs(process.argv.slice(2));
  await runScreen(config);
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
