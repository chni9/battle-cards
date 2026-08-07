/**
 * Configurable gross-imbalance screen runner — technical spec v4 §7 / Lot 31.
 */

import { mkdir, writeFile } from 'node:fs/promises';

import type { KitId } from '@card-battle/shared';

import { createInitialState } from '../engine/create-initial-state';
import {
  aggregateRows,
  emptyStallLedger,
  recordAttemptedMatchup,
  recordSeatedKits,
  recordStall,
} from './aggregate';
import { serializeGameRow } from './emit-row';
import { runSimulatedGame, type SimulationGameRow } from './run-game';
import { unorderedPairs, type ScreenConfig } from './screen-config';

export interface RunScreenOptions {
  /** Test-only: force every game's turn cap (default 2500). */
  maxTurns?: number;
  /** Suppress per-cell progress logs (tests). */
  quiet?: boolean;
}

export interface ScreenRunResult {
  rows: readonly SimulationGameRow[];
  report: ReturnType<typeof aggregateRows>;
  config: ScreenConfig;
  outDir: string;
}

function tryRun(
  input: Parameters<typeof runSimulatedGame>[0],
): SimulationGameRow | 'stalled' {
  try {
    return runSimulatedGame(input);
  } catch (error) {
    if (error instanceof Error && error.message.includes('MAX_TURNS')) {
      return 'stalled';
    }

    throw error;
  }
}

/**
 * Reproduce the starting-kit deal for a stalled random game so stall
 * attribution does not invent kits. Same path as `runSimulatedGame` without the loop.
 */
function peekStartingKits(seed: string, playerCount: number): readonly KitId[] {
  const seats = Array.from({ length: playerCount }, (_, index) => ({
    id: `bot-${String(index)}`,
    nickname: `Bot${String(index)}`,
  }));
  const state = createInitialState({ seats, seed });
  return state.players.map((player) => player.kitId);
}

export async function runScreen(
  config: ScreenConfig,
  options: RunScreenOptions = {},
): Promise<ScreenRunResult> {
  await mkdir(config.outDir, { recursive: true });

  const rows: SimulationGameRow[] = [];
  const ledger = emptyStallLedger();
  const pairs = unorderedPairs(config.oneVOneKits);
  const maxTurnsOpt =
    options.maxTurns !== undefined ? { maxTurns: options.maxTurns } : {};

  for (const [pairIndex, [kitA, kitB]] of pairs.entries()) {
    if (options.quiet !== true) {
      console.log(
        `1v1 cell ${String(pairIndex + 1)}/${String(pairs.length)}: ${kitA} vs ${kitB}`,
      );
    }

    for (let index = 0; index < config.gamesPerCell; index += 1) {
      recordAttemptedMatchup(ledger, kitA, kitB);

      const outcome = tryRun({
        seed: `${config.baseSeed}:1v1:${kitA}-vs-${kitB}:${String(index)}`,
        playerCount: 2,
        difficulties: [config.difficulty, config.difficulty],
        kitAssignment: [kitA, kitB],
        ...maxTurnsOpt,
      });

      if (outcome === 'stalled') {
        recordStall(ledger, [kitA, kitB], { kitA, kitB });
      } else {
        recordSeatedKits(ledger.seatedByKit, [kitA, kitB]);
        rows.push(outcome);
      }
    }
  }

  if (config.fourPlayer.mode === 'fixed') {
    const mix = config.fourPlayer.mix;

    if (mix === undefined) {
      throw new Error('fixed four-player mode requires mix');
    }

    if (options.quiet !== true) {
      console.log(`4p fixed mix × ${String(config.fourPlayer.games)}`);
    }

    for (let index = 0; index < config.fourPlayer.games; index += 1) {
      const outcome = tryRun({
        seed: `${config.baseSeed}:4p-one-each:${String(index)}`,
        playerCount: 4,
        difficulties: [
          config.difficulty,
          config.difficulty,
          config.difficulty,
          config.difficulty,
        ],
        kitAssignment: mix,
        ...maxTurnsOpt,
      });

      if (outcome === 'stalled') {
        recordStall(ledger, mix, null);
      } else {
        recordSeatedKits(ledger.seatedByKit, mix);
        rows.push(outcome);
      }
    }
  } else {
    if (options.quiet !== true) {
      console.log(`4p random × ${String(config.fourPlayer.games)}`);
    }

    for (let index = 0; index < config.fourPlayer.games; index += 1) {
      const seed = `${config.baseSeed}:4p-random:${String(index)}`;
      const outcome = tryRun({
        seed,
        playerCount: 4,
        difficulties: [
          config.difficulty,
          config.difficulty,
          config.difficulty,
          config.difficulty,
        ],
        ...maxTurnsOpt,
      });

      if (outcome === 'stalled') {
        recordStall(ledger, peekStartingKits(seed, 4), null);
      } else {
        const kits = outcome.players.map((player) => player.startingKitId);
        recordSeatedKits(ledger.seatedByKit, kits);
        rows.push(outcome);
      }
    }
  }

  const report = aggregateRows(rows, ledger);
  const jsonl = rows.map((row) => serializeGameRow(row)).join('');

  const configPayload = {
    baseSeed: config.baseSeed,
    gamesPerCell: config.gamesPerCell,
    difficulty: config.difficulty,
    oneVOneKits: config.oneVOneKits,
    oneVOnePairs: pairs,
    fourPlayer: config.fourPlayer,
    undersampledCardThreshold: config.undersampledCardThreshold,
    coverageNote: config.coverageNote,
  };

  await writeFile(
    `${config.outDir}/config.json`,
    `${JSON.stringify(configPayload, null, 2)}\n`,
  );
  await writeFile(`${config.outDir}/games.jsonl`, jsonl);
  await writeFile(
    `${config.outDir}/aggregates.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  );

  if (options.quiet !== true) {
    console.log(
      `Completed ${String(report.completedGames)} games, stalled ${String(report.stalledGames)}. Wrote ${config.outDir}`,
    );
  }

  return { rows, report, config, outDir: config.outDir };
}
