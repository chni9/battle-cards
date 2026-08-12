/**
 * Headless policy arena — technical spec v5 §7.2 (L32-06).
 *
 * Usage:
 *   pnpm --filter @card-battle/server arena -- \
 *     --games 100 --policy-a heuristic-v4 --policy-b random-legal \
 *     --seed arena --out ./arena-games.jsonl
 *
 * For each of N base seeds, plays both seat orientations (2N games per kit mode).
 * Kit modes `mirrored` and `random` are reported separately. Never writes Postgres.
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { KIT_IDS, type KitId } from '@card-battle/shared';

import { getPolicy } from '../bots/registry';
import { createRng } from '../engine/rng';
import {
  buildKitModeReport,
  policyAWonGame,
  seatPolicyPermutations,
  type ArenaGameObservation,
  type ArenaKitModeReport,
} from './arena-metrics';
import { parseArenaArgs, type ArenaConfig, type ArenaKitMode } from './arena-config';
import { serializeGameRow } from './emit-row';
import { serializeFeatureSnapshotRow } from './feature-snapshots';
import { isStallError } from './run-batch';
import { runSimulatedGame } from './run-game';

export interface ArenaRunResult {
  gamesBody: string;
  summaryBody: string;
  completed: number;
  stalled: number;
  reports: readonly ArenaKitModeReport[];
}

export interface RunArenaOptions {
  /** Test-only: force every game's turn cap (default 2500). */
  maxTurns?: number;
}

export function arenaGameSeed(
  baseSeed: string,
  kitMode: ArenaKitMode,
  gameIndex: number,
  orientationIndex: number,
): string {
  return `${baseSeed}:${kitMode}:${String(gameIndex)}:${String(orientationIndex)}`;
}

export function mirroredKitForSeed(seed: string): KitId {
  const rng = createRng(`${seed}:arena:mirrored-kit`);
  return rng.pick([...KIT_IDS]);
}

export function summaryPathForGames(outPath: string): string {
  if (outPath.endsWith('.jsonl')) {
    return `${outPath.slice(0, -'.jsonl'.length)}.arena-summary.json`;
  }

  return `${outPath}.arena-summary.json`;
}

export async function runArena(
  argv: readonly string[],
  options: RunArenaOptions = {},
): Promise<ArenaRunResult> {
  const config = parseArenaArgs(argv);
  return runArenaWithConfig(config, options);
}

export async function runArenaWithConfig(
  config: ArenaConfig,
  options: RunArenaOptions = {},
): Promise<ArenaRunResult> {
  const policyA = getPolicy(config.policyA);
  const policyB = getPolicy(config.policyB);
  const policyMeta = {
    policyA: { id: policyA.id, weightsHash: policyA.weightsHash },
    policyB: { id: policyB.id, weightsHash: policyB.weightsHash },
  };
  const orientations = seatPolicyPermutations(config.policyA, config.policyB);
  const lines: string[] = [];
  const featureLines: string[] = [];
  const reports: ArenaKitModeReport[] = [];
  let completed = 0;
  let stalled = 0;

  for (const kitMode of config.kitModes) {
    const observations: ArenaGameObservation[] = [];
    let attemptedGames = 0;
    let stalledGames = 0;

    for (let gameIndex = 0; gameIndex < config.games; gameIndex += 1) {
      for (const [orientationIndex, policyIds] of orientations.entries()) {
        attemptedGames += 1;
        const seed = arenaGameSeed(
          config.baseSeed,
          kitMode,
          gameIndex,
          orientationIndex,
        );
        const kitAssignment =
          kitMode === 'mirrored'
            ? (() => {
                const kit = mirroredKitForSeed(seed);
                return [kit, kit] as const;
              })()
            : undefined;
        const decisionIterations: number[] = [];

        try {
          const row = runSimulatedGame({
            seed,
            playerCount: config.playerCount,
            difficulties: [config.difficulty, config.difficulty],
            policyIds,
            weightsProfile: config.weightsProfile,
            captureFeatureSnapshots: config.featureSnapshotsPath !== null,
            ...(kitAssignment !== undefined ? { kitAssignment } : {}),
            ...(options.maxTurns !== undefined ? { maxTurns: options.maxTurns } : {}),
            onPolicyDecide: (telemetry) => {
              decisionIterations.push(telemetry.iterations);
            },
          });

          lines.push(serializeGameRow(row));

          if (row.featureSnapshots !== undefined) {
            for (const snapshot of row.featureSnapshots) {
              featureLines.push(serializeFeatureSnapshotRow(snapshot));
            }
          }

          completed += 1;
          observations.push({
            policyAWon: policyAWonGame(
              row.winnerPlayerId,
              policyIds,
              config.policyA,
            ),
            turnSequence: row.turnSequence,
            startingKitIds: row.players.map((player) => player.startingKitId),
            decisionIterations,
          });
        } catch (error) {
          if (isStallError(error)) {
            stalled += 1;
            stalledGames += 1;
            continue;
          }

          throw error;
        }
      }
    }

    reports.push(
      buildKitModeReport({
        kitMode,
        ...policyMeta,
        attemptedGames,
        stalledGames,
        observations,
      }),
    );
  }

  const gamesBody = lines.join('');
  const summary = {
    baseSeed: config.baseSeed,
    gamesPerOrientation: config.games,
    seatOrientations: orientations.length,
    playerCount: config.playerCount,
    difficulty: config.difficulty,
    kitModes: config.kitModes,
    policyA: policyMeta.policyA,
    policyB: policyMeta.policyB,
    completedGames: completed,
    stalledGames: stalled,
    reports,
  };
  const summaryBody = `${JSON.stringify(summary, null, 2)}\n`;

  await writeFile(config.outPath, gamesBody, 'utf8');
  await writeFile(summaryPathForGames(config.outPath), summaryBody, 'utf8');

  if (config.featureSnapshotsPath !== null) {
    await writeFile(config.featureSnapshotsPath, featureLines.join(''), 'utf8');
  }

  return {
    gamesBody,
    summaryBody,
    completed,
    stalled,
    reports,
  };
}

async function main(): Promise<void> {
  try {
    const result = await runArena(process.argv.slice(2));
    console.log(
      `Wrote ${String(result.completed)} game(s)` +
        (result.stalled > 0
          ? `, skipped ${String(result.stalled)} stall(s) (MAX_TURNS).`
          : '.'),
    );

    for (const report of result.reports) {
      console.log(
        `${report.kitMode}: policy A win rate ${(report.winRate * 100).toFixed(1)}% ` +
          `(Wilson ${(report.wilsonInterval.lower * 100).toFixed(1)}–` +
          `${(report.wilsonInterval.upper * 100).toFixed(1)}%), ` +
          `Elo Δ ${report.eloDelta.toFixed(2)}`,
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
