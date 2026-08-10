/**
 * Arena aggregate metrics — technical spec v5 §7.2 (L32-06).
 */

import type { KitId } from '@card-battle/shared';

import { wilsonInterval } from './wilson-interval';

const DEFAULT_ELO = 1500;
const ELO_K = 32;

export interface LatencyDistribution {
  count: number;
  mean: number;
  p50: number;
  p90: number;
  p99: number;
  histogram: Record<string, number>;
}

export interface PerKitArenaStats {
  games: number;
  policyAWins: number;
  winRate: number;
}

export interface ArenaKitModeReport {
  kitMode: 'mirrored' | 'random';
  attemptedGames: number;
  completedGames: number;
  stalledGames: number;
  policyA: { id: string; weightsHash: string };
  policyB: { id: string; weightsHash: string };
  policyAWins: number;
  winRate: number;
  wilsonInterval: ReturnType<typeof wilsonInterval>;
  eloDelta: number;
  turnCount: { mean: number; p50: number };
  perKit: Record<string, PerKitArenaStats>;
  decisionLatency: LatencyDistribution;
}

export interface ArenaGameObservation {
  policyAWon: boolean;
  turnSequence: number;
  startingKitIds: readonly KitId[];
  decisionIterations: readonly number[];
}

export function seatPolicyPermutations(
  policyA: string,
  policyB: string,
): readonly (readonly [string, string])[] {
  return [
    [policyA, policyB],
    [policyB, policyA],
  ];
}

export function policyAWonGame(
  winnerPlayerId: string,
  policyIds: readonly [string, string],
  policyA: string,
): boolean {
  const winnerPolicyId =
    winnerPlayerId === 'bot-0' ? policyIds[0] : policyIds[1];
  return winnerPolicyId === policyA;
}

export function computeEloDelta(
  wins: number,
  games: number,
  ratingA = DEFAULT_ELO,
  ratingB = DEFAULT_ELO,
  k = ELO_K,
): number {
  if (games <= 0) {
    return 0;
  }

  const expected = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  return k * (wins - games * expected);
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }

  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(sorted.length * p)),
  );
  return sorted[index] ?? 0;
}

export function buildLatencyDistribution(
  iterations: readonly number[],
): LatencyDistribution {
  const sorted = [...iterations].sort((left, right) => left - right);
  const count = sorted.length;
  const mean =
    count === 0 ? 0 : sorted.reduce((sum, value) => sum + value, 0) / count;
  const histogram: Record<string, number> = {};

  for (const value of sorted) {
    const key = String(value);
    histogram[key] = (histogram[key] ?? 0) + 1;
  }

  return {
    count,
    mean,
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    p99: percentile(sorted, 0.99),
    histogram,
  };
}

export function buildKitModeReport(input: {
  kitMode: 'mirrored' | 'random';
  policyA: { id: string; weightsHash: string };
  policyB: { id: string; weightsHash: string };
  attemptedGames: number;
  stalledGames: number;
  observations: readonly ArenaGameObservation[];
}): ArenaKitModeReport {
  const completedGames = input.observations.length;
  const isSelfPlay = input.policyA.id === input.policyB.id;
  const policyAWins = isSelfPlay
    ? completedGames / 2
    : input.observations.filter((row) => row.policyAWon).length;
  const winRate = completedGames === 0 ? 0 : policyAWins / completedGames;
  const turnLengths = input.observations
    .map((row) => row.turnSequence)
    .sort((left, right) => left - right);
  const turnMean =
    turnLengths.length === 0
      ? 0
      : turnLengths.reduce((sum, value) => sum + value, 0) / turnLengths.length;
  const perKit: Record<string, PerKitArenaStats> = {};

  for (const observation of input.observations) {
    const kitId = observation.startingKitIds[0];

    if (kitId === undefined) {
      continue;
    }

    const entry = perKit[kitId] ?? { games: 0, policyAWins: 0, winRate: 0 };
    entry.games += 1;

    if (isSelfPlay) {
      entry.policyAWins += 0.5;
    } else if (observation.policyAWon) {
      entry.policyAWins += 1;
    }

    perKit[kitId] = entry;
  }

  for (const kitId of Object.keys(perKit)) {
    const entry = perKit[kitId];

    if (entry !== undefined && entry.games > 0) {
      entry.winRate = entry.policyAWins / entry.games;
    }
  }

  const allIterations = input.observations.flatMap((row) => row.decisionIterations);

  return {
    kitMode: input.kitMode,
    attemptedGames: input.attemptedGames,
    completedGames,
    stalledGames: input.stalledGames,
    policyA: input.policyA,
    policyB: input.policyB,
    policyAWins,
    winRate,
    wilsonInterval: wilsonInterval(policyAWins, completedGames),
    eloDelta: isSelfPlay ? 0 : computeEloDelta(policyAWins, completedGames),
    turnCount: {
      mean: turnMean,
      p50: percentile(turnLengths, 0.5),
    },
    perKit,
    decisionLatency: buildLatencyDistribution(allIterations),
  };
}
