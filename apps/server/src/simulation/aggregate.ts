/**
 * Aggregate simulation JSONL rows — technical spec v3 §8.3 (L18-05), Lot 31 extensions.
 */

import type { KitId } from '@card-battle/shared';

import type { SimulationGameRow } from './run-game';
import { matchupId } from './screen-config';

export interface StallKitStats {
  stalledGames: number;
  seatedGames: number;
}

export interface StallMatchupStats {
  kitA: KitId;
  kitB: KitId;
  stalledGames: number;
  attemptedGames: number;
}

export interface KitDrawStats {
  games: number;
  totalDraws: number;
  meanDrawsPerGame: number;
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
  stallsByKit: Record<string, StallKitStats>;
  stallsByMatchup: Record<string, StallMatchupStats>;
  cardAppearances: Record<string, number>;
  drawStatsByKit: Record<string, KitDrawStats>;
}

export interface StallLedger {
  stalledGames: number;
  /** Seated starting kits for each stalled game (one entry per seat). */
  stalledSeatsByKit: ReadonlyMap<string, number>;
  /** 1v1 matchup stalls only. */
  stalledByMatchup: ReadonlyMap<string, { kitA: KitId; kitB: KitId; count: number }>;
  /** Attempted 1v1 games per matchup (completed + stalled). */
  attemptedByMatchup: ReadonlyMap<string, { kitA: KitId; kitB: KitId; count: number }>;
  /** Seated games (completed + stalled) per kit. */
  seatedByKit: ReadonlyMap<string, number>;
}

export function emptyStallLedger(): {
  stalledGames: number;
  stalledSeatsByKit: Map<string, number>;
  stalledByMatchup: Map<string, { kitA: KitId; kitB: KitId; count: number }>;
  attemptedByMatchup: Map<string, { kitA: KitId; kitB: KitId; count: number }>;
  seatedByKit: Map<string, number>;
} {
  return {
    stalledGames: 0,
    stalledSeatsByKit: new Map(),
    stalledByMatchup: new Map(),
    attemptedByMatchup: new Map(),
    seatedByKit: new Map(),
  };
}

export function recordSeatedKits(
  seatedByKit: Map<string, number>,
  kits: readonly KitId[],
): void {
  for (const kitId of kits) {
    seatedByKit.set(kitId, (seatedByKit.get(kitId) ?? 0) + 1);
  }
}

export function recordStall(
  ledger: ReturnType<typeof emptyStallLedger>,
  kits: readonly KitId[],
  matchup: { kitA: KitId; kitB: KitId } | null,
): void {
  ledger.stalledGames += 1;
  recordSeatedKits(ledger.seatedByKit, kits);

  for (const kitId of kits) {
    ledger.stalledSeatsByKit.set(
      kitId,
      (ledger.stalledSeatsByKit.get(kitId) ?? 0) + 1,
    );
  }

  if (matchup !== null) {
    const key = matchupId(matchup.kitA, matchup.kitB);
    const entry = ledger.stalledByMatchup.get(key) ?? {
      kitA: matchup.kitA < matchup.kitB ? matchup.kitA : matchup.kitB,
      kitB: matchup.kitA < matchup.kitB ? matchup.kitB : matchup.kitA,
      count: 0,
    };
    entry.count += 1;
    ledger.stalledByMatchup.set(key, entry);
  }
}

export function recordAttemptedMatchup(
  ledger: ReturnType<typeof emptyStallLedger>,
  kitA: KitId,
  kitB: KitId,
): void {
  const key = matchupId(kitA, kitB);
  const sortedA = kitA < kitB ? kitA : kitB;
  const sortedB = kitA < kitB ? kitB : kitA;
  const entry = ledger.attemptedByMatchup.get(key) ?? {
    kitA: sortedA,
    kitB: sortedB,
    count: 0,
  };
  entry.count += 1;
  ledger.attemptedByMatchup.set(key, entry);
}

export function aggregateRows(
  rows: readonly SimulationGameRow[],
  ledger: StallLedger,
): AggregateReport {
  const winRateByKit: Record<string, { wins: number; games: number; rate: number }> = {};
  const winRateByMatchup: AggregateReport['winRateByMatchup'] = {};
  const eliminationReasons: Record<string, number> = {};
  const lengths: number[] = [];
  const cardAppearances: Record<string, number> = {};
  const drawTotals: Record<string, { games: number; totalDraws: number }> = {};

  for (const row of rows) {
    lengths.push(row.turnSequence);

    const cardsSeenThisGame = new Set<string>();

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

      const drawEntry = drawTotals[player.startingKitId] ?? {
        games: 0,
        totalDraws: 0,
      };
      drawEntry.games += 1;
      drawEntry.totalDraws += player.drawCount;
      drawTotals[player.startingKitId] = drawEntry;

      for (const [cardId, count] of Object.entries(player.cardsPlayedById)) {
        if (count > 0) {
          cardsSeenThisGame.add(cardId);
        }
      }
    }

    for (const cardId of cardsSeenThisGame) {
      cardAppearances[cardId] = (cardAppearances[cardId] ?? 0) + 1;
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

  const stallsByKit: Record<string, StallKitStats> = {};

  for (const [kitId, seatedGames] of ledger.seatedByKit.entries()) {
    stallsByKit[kitId] = {
      stalledGames: ledger.stalledSeatsByKit.get(kitId) ?? 0,
      seatedGames,
    };
  }

  for (const [kitId, stalledGames] of ledger.stalledSeatsByKit.entries()) {
    stallsByKit[kitId] ??= {
      stalledGames,
      seatedGames: stalledGames,
    };
  }

  const stallsByMatchup: Record<string, StallMatchupStats> = {};

  for (const [key, attempted] of ledger.attemptedByMatchup.entries()) {
    const stalled = ledger.stalledByMatchup.get(key)?.count ?? 0;
    stallsByMatchup[key] = {
      kitA: attempted.kitA,
      kitB: attempted.kitB,
      stalledGames: stalled,
      attemptedGames: attempted.count,
    };
  }

  const drawStatsByKit: Record<string, KitDrawStats> = {};

  for (const [kitId, totals] of Object.entries(drawTotals)) {
    drawStatsByKit[kitId] = {
      games: totals.games,
      totalDraws: totals.totalDraws,
      meanDrawsPerGame: totals.games === 0 ? 0 : totals.totalDraws / totals.games,
    };
  }

  return {
    completedGames: rows.length,
    stalledGames: ledger.stalledGames,
    winRateByKit,
    winRateByMatchup,
    turnSequence: {
      min: lengths[0] ?? 0,
      max: lengths[lengths.length - 1] ?? 0,
      mean,
      p50,
    },
    eliminationReasons,
    stallsByKit,
    stallsByMatchup,
    cardAppearances,
    drawStatsByKit,
  };
}
