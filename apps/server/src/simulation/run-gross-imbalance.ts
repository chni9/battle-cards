/**
 * First gross-imbalance screen runner — technical spec v3 §8.3 (L18-05).
 *
 * Hard-only matrix: 6 unordered 1v1 kit pairs × N + one-of-each 4p × N.
 * Stalls (MAX_TURNS) are counted, not invented as wins.
 *
 * Usage:
 *   pnpm --filter @card-battle/server exec tsx src/simulation/run-gross-imbalance.ts
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { KIT_IDS, type KitId } from '@card-battle/shared';

import { aggregateRows } from './aggregate';
import { serializeGameRow } from './emit-row';
import { runSimulatedGame, type SimulationGameRow } from './run-game';

const GAMES_PER_CELL = 200;
const BASE_SEED = 'gross-imbalance-2026-08-04';
const OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../docs/simulation/2026-08-04-gross-imbalance',
);

function unorderedPairs(kits: readonly KitId[]): readonly [KitId, KitId][] {
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

function tryRun(input: Parameters<typeof runSimulatedGame>[0]): SimulationGameRow | 'stalled' {
  try {
    return runSimulatedGame(input);
  } catch (error) {
    if (error instanceof Error && error.message.includes('MAX_TURNS')) {
      return 'stalled';
    }

    throw error;
  }
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const rows: SimulationGameRow[] = [];
  let stalledGames = 0;
  const pairs = unorderedPairs(KIT_IDS);

  for (const [kitA, kitB] of pairs) {
    for (let index = 0; index < GAMES_PER_CELL; index += 1) {
      const outcome = tryRun({
        seed: `${BASE_SEED}:1v1:${kitA}-vs-${kitB}:${String(index)}`,
        playerCount: 2,
        difficulties: ['hard', 'hard'],
        kitAssignment: [kitA, kitB],
      });

      if (outcome === 'stalled') {
        stalledGames += 1;
      } else {
        rows.push(outcome);
      }
    }
  }

  for (let index = 0; index < GAMES_PER_CELL; index += 1) {
    const outcome = tryRun({
      seed: `${BASE_SEED}:4p-one-each:${String(index)}`,
      playerCount: 4,
      difficulties: ['hard', 'hard', 'hard', 'hard'],
      kitAssignment: ['untouchable', 'kamikaze', 'scientific', 'assassin'],
    });

    if (outcome === 'stalled') {
      stalledGames += 1;
    } else {
      rows.push(outcome);
    }
  }

  const report = aggregateRows(rows, stalledGames);
  const jsonl = rows.map((row) => serializeGameRow(row)).join('');

  const config = {
    baseSeed: BASE_SEED,
    gamesPerCell: GAMES_PER_CELL,
    difficulty: 'hard',
    oneVOnePairs: pairs,
    fourPlayerMix: ['untouchable', 'kamikaze', 'scientific', 'assassin'],
    note: 'Difficulty sweeps deferred. Stalls counted separately (heuristic hangs).',
  };

  await writeFile(path.join(OUT_DIR, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
  await writeFile(path.join(OUT_DIR, 'games.jsonl'), jsonl);
  await writeFile(
    path.join(OUT_DIR, 'aggregates.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  console.log(
    `Completed ${String(report.completedGames)} games, stalled ${String(stalledGames)}. Wrote ${OUT_DIR}`,
  );
}

void main();
