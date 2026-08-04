/**
 * Aggregate simulation JSONL rows — technical spec v3 §8.3 (L18-05).
 */

import type { KitId } from '@card-battle/shared';

import type { SimulationGameRow } from './run-game';

export interface MatchupKey {
  kitA: KitId;
  kitB: KitId;
}

export interface AggregateReport {
  completedGames: number;
  stalledGames: number;
  winRateByKit: Record<string, { wins: number; games: number; rate: number }>;
  winRateByMatchup: Record<
    string,
    { kitA: KitId; kitB: KitId; winsA: number; winsB: number; games: number }
  >;
  turnSequence: {
    min: number;
    max: number;
    mean: number;
    p50: number;
  };
  eliminationReasons: Record<string, number>;
}

function matchupId(kitA: KitId, kitB: KitId): string {
  return `${kitA}_vs_${kitB}`;
}

export function aggregateRows(
  rows: readonly SimulationGameRow[],
  stalledGames: number,
): AggregateReport {
  const winRateByKit: Record<string, { wins: number; games: number; rate: number }> = {};
  const winRateByMatchup: AggregateReport['winRateByMatchup'] = {};
  const eliminationReasons: Record<string, number> = {};
  const lengths: number[] = [];

  for (const row of rows) {
    lengths.push(row.turnSequence);

    for (const player of row.players) {
      const kitEntry = winRateByKit[player.startingKitId] ?? {
        wins: 0,
        games: 0,
        rate: 0,
      };
      kitEntry.games += 1;
      if (player.isWinner) {
        kitEntry.wins += 1;
      }
      winRateByKit[player.startingKitId] = kitEntry;
    }

    if (row.players.length === 2) {
      const first = row.players[0];
      const second = row.players[1];

      if (first !== undefined && second !== undefined) {
        const sorted = [first.startingKitId, second.startingKitId].sort() as [
          KitId,
          KitId,
        ];
        const key = matchupId(sorted[0], sorted[1]);
        const entry = winRateByMatchup[key] ?? {
          kitA: sorted[0],
          kitB: sorted[1],
          winsA: 0,
          winsB: 0,
          games: 0,
        };
        entry.games += 1;
        if (first.isWinner) {
          if (first.startingKitId === sorted[0]) {
            entry.winsA += 1;
          } else {
            entry.winsB += 1;
          }
        } else if (second.isWinner) {
          if (second.startingKitId === sorted[0]) {
            entry.winsA += 1;
          } else {
            entry.winsB += 1;
          }
        }
        winRateByMatchup[key] = entry;
      }
    }

    for (const elimination of row.eliminations) {
      eliminationReasons[elimination.reason] =
        (eliminationReasons[elimination.reason] ?? 0) + 1;
    }
  }

  for (const kitId of Object.keys(winRateByKit)) {
    const entry = winRateByKit[kitId];

    if (entry !== undefined && entry.games > 0) {
      entry.rate = entry.wins / entry.games;
    }
  }

  lengths.sort((left, right) => left - right);
  const mean =
    lengths.length === 0
      ? 0
      : lengths.reduce((sum, value) => sum + value, 0) / lengths.length;
  const p50 =
    lengths.length === 0 ? 0 : (lengths[Math.floor(lengths.length / 2)] ?? 0);

  return {
    completedGames: rows.length,
    stalledGames,
    winRateByKit,
    winRateByMatchup,
    turnSequence: {
      min: lengths[0] ?? 0,
      max: lengths[lengths.length - 1] ?? 0,
      mean,
      p50,
    },
    eliminationReasons,
  };
}
