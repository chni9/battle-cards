/**
 * L32-07 — validate arena/registry against published V4 kit rates.
 *
 * Runs heuristic-v4 vs itself (random kits, seat-rotated) and compares
 * starting-kit win rates to `docs/simulation/2026-08-07-v4-content/aggregates.json`.
 *
 *   pnpm --filter @card-battle/server exec tsx src/simulation/validate-arena-vs-v4.ts
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { HEURISTIC_V4_POLICY_ID } from '../bots/registry';
import { runArenaWithConfig } from './run-arena';
import { wilsonInterval } from './wilson-interval';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../../..');
const V4_AGGREGATES = path.join(
  REPO_ROOT,
  'docs/simulation/2026-08-07-v4-content/aggregates.json',
);
const OUT_DIR = path.join(REPO_ROOT, 'docs/simulation/2026-08-10-v5-arena-validation');

interface V4KitRate {
  wins: number;
  games: number;
  rate: number;
}

interface GameRow {
  winnerPlayerId: string;
  players: readonly {
    playerId: string;
    startingKitId: string;
    isWinner: boolean;
  }[];
}

function kitWinRatesFromJsonl(body: string): Record<string, { wins: number; games: number; rate: number }> {
  const stats: Record<string, { wins: number; games: number }> = {};

  for (const line of body.trimEnd().split('\n')) {
    if (line.length === 0) {
      continue;
    }

    const row = JSON.parse(line) as GameRow;

    for (const player of row.players) {
      const entry = stats[player.startingKitId] ?? { wins: 0, games: 0 };
      entry.games += 1;

      if (player.isWinner) {
        entry.wins += 1;
      }

      stats[player.startingKitId] = entry;
    }
  }

  const rates: Record<string, { wins: number; games: number; rate: number }> = {};

  for (const [kitId, entry] of Object.entries(stats)) {
    rates[kitId] = {
      wins: entry.wins,
      games: entry.games,
      rate: entry.games === 0 ? 0 : entry.wins / entry.games,
    };
  }

  return rates;
}

async function main(): Promise<void> {
  const v4Raw = JSON.parse(await readFile(V4_AGGREGATES, 'utf8')) as {
    completedGames: number;
    stalledGames: number;
    winRateByKit: Record<string, V4KitRate>;
  };

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'arena-games.jsonl');

  // Seat-rotated self-play; random kits so kit strength is measurable.
  // 80 base seeds × 2 orientations = 160 games — enough for a CI overlap check.
  const arena = await runArenaWithConfig({
    games: 80,
    playerCount: 2,
    policyA: HEURISTIC_V4_POLICY_ID,
    policyB: HEURISTIC_V4_POLICY_ID,
    baseSeed: 'l32-07-v4-validation',
    difficulty: 'hard',
    kitModes: ['random'],
    outPath,
    weightsProfile: null,
        featureSnapshotsPath: null,
  });

  const arenaKitRates = kitWinRatesFromJsonl(arena.gamesBody);
  const comparisons: {
    kitId: string;
    v4Rate: number;
    v4Games: number;
    v4Wilson: ReturnType<typeof wilsonInterval>;
    arenaRate: number;
    arenaGames: number;
    arenaWilson: ReturnType<typeof wilsonInterval>;
    v4RateInsideArenaCi: boolean;
    arenaRateInsideV4Ci: boolean;
    agree: boolean;
  }[] = [];

  for (const [kitId, v4] of Object.entries(v4Raw.winRateByKit)) {
    const arenaKit = arenaKitRates[kitId];
    const arenaWins = arenaKit?.wins ?? 0;
    const arenaGames = arenaKit?.games ?? 0;
    const arenaRate = arenaKit?.rate ?? 0;
    const v4Wilson = wilsonInterval(v4.wins, v4.games);
    const arenaWilson = wilsonInterval(arenaWins, arenaGames);
    const v4RateInsideArenaCi =
      arenaGames > 0 && v4.rate >= arenaWilson.lower && v4.rate <= arenaWilson.upper;
    const arenaRateInsideV4Ci =
      arenaGames > 0 && arenaRate >= v4Wilson.lower && arenaRate <= v4Wilson.upper;
    // Agreement: either rate sits in the other's CI (sample-size aware).
    const agree = v4RateInsideArenaCi || arenaRateInsideV4Ci;

    comparisons.push({
      kitId,
      v4Rate: v4.rate,
      v4Games: v4.games,
      v4Wilson,
      arenaRate,
      arenaGames,
      arenaWilson,
      v4RateInsideArenaCi,
      arenaRateInsideV4Ci,
      agree,
    });
  }

  const disagreements = comparisons.filter((row) => !row.agree);
  const summary = {
    date: '2026-08-10',
    task: 'L32-07',
    v4Screen: 'docs/simulation/2026-08-07-v4-content/',
    arena: {
      baseSeed: 'l32-07-v4-validation',
      gamesPerOrientation: 80,
      seatOrientations: 2,
      completed: arena.completed,
      stalled: arena.stalled,
      policy: HEURISTIC_V4_POLICY_ID,
      difficulty: 'hard',
      kitMode: 'random',
    },
    v4: {
      completedGames: v4Raw.completedGames,
      stalledGames: v4Raw.stalledGames,
      stallRate: v4Raw.stalledGames / (v4Raw.completedGames + v4Raw.stalledGames),
    },
    arenaStallRate:
      arena.stalled + arena.completed === 0
        ? 0
        : arena.stalled / (arena.stalled + arena.completed),
    comparisons,
    disagreements: disagreements.map((row) => row.kitId),
    verdict:
      disagreements.length === 0
        ? 'agreement'
        : `discrepancy: ${disagreements.map((row) => row.kitId).join(', ')}`,
  };

  await writeFile(
    path.join(OUT_DIR, 'comparison.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8',
  );

  const writeup = `# Arena validation vs V4 screen (L32-07)

**Date:** 2026-08-10  
**Task:** L32-07  
**V4 reference:** [\`docs/simulation/2026-08-07-v4-content/\`](../2026-08-07-v4-content/)  
**Arena raw:** [\`arena-games.jsonl\`](./arena-games.jsonl) · [\`comparison.json\`](./comparison.json)

## What was measured

\`heuristic-v4\` vs itself through the L32-06 arena (registry path), **random** kits,
**hard** difficulty, seat rotation mandatory (80 base seeds × 2 orientations = up to 160
completed games). Kit win rates are counted from each seat's \`startingKitId\` in the
JSONL — not from the arena's policy-A self-play half-count (which is always 0.5).

## Stall rates

| Source | Stall rate |
|---|---|
| V4 screen | ${(v4Raw.stalledGames / (v4Raw.completedGames + v4Raw.stalledGames)).toFixed(3)} (${v4Raw.stalledGames} / ${v4Raw.completedGames + v4Raw.stalledGames}) |
| Arena validation | ${summary.arenaStallRate.toFixed(3)} (${arena.stalled} / ${arena.stalled + arena.completed}) |

## Per-kit agreement

For each kit, agreement means the V4 published rate sits inside the arena sample's
Wilson CI **or** the arena rate sits inside the V4 screen's Wilson CI.

**Verdict: ${summary.verdict}**

${
  disagreements.length === 0
    ? 'All 15 kits agree within confidence intervals. No arena/registry defect found.'
    : `Discrepancies (arena or registry defect until proven otherwise, not a kit finding): ${disagreements
        .map((row) => row.kitId)
        .join(', ')}.`
}

| Kit | V4 rate | Arena rate | Agree |
|---|---:|---:|:---:|
${comparisons
  .map(
    (row) =>
      `| ${row.kitId} | ${row.v4Rate.toFixed(3)} (n=${String(row.v4Games)}) | ${row.arenaRate.toFixed(3)} (n=${String(row.arenaGames)}) | ${row.agree ? 'yes' : 'NO'} |`,
  )
  .join('\n')}

## Reproduction

\`\`\`bash
pnpm --filter @card-battle/server exec tsx src/simulation/validate-arena-vs-v4.ts
\`\`\`

Base seed \`l32-07-v4-validation\`. Same seed + config → identical JSONL.
`;

  await writeFile(path.join(OUT_DIR, 'WRITEUP.md'), writeup, 'utf8');
  console.log(summary.verdict);
  console.log(`wrote ${OUT_DIR}`);
}

await main();
