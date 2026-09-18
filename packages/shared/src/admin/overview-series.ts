/**
 * Overview bucket math (Lot 62 / technical spec v6 §15).
 * Shared so SQL aliases and charts use the same edges.
 */

import { FEEDBACK_KINDS, type FeedbackKind } from '../feedback/report';
import {
  ADMIN_DURATION_BUCKET_IDS,
  ADMIN_DURATION_BUCKET_MS,
  ADMIN_ELIM_REASON_IDS,
  ADMIN_OCCUPANCY_KEYS,
  ADMIN_WINNER_LIVES_BUCKET_IDS,
  type AdminDurationBucketId,
  type AdminElimReasonId,
  type AdminHourCountRow,
  type AdminKindCountRow,
  type AdminLeaveRateRow,
  type AdminOccupancyCountRow,
  type AdminOccupancyDurationRow,
  type AdminOpponentMixDurationRow,
  type AdminReasonCountRow,
  type AdminWinnerLivesBucketId,
} from './api';

export function durationBucketId(durationMs: number): AdminDurationBucketId {
  if (durationMs < ADMIN_DURATION_BUCKET_MS.fiveMin) {
    return 'under5min';
  }
  if (durationMs < ADMIN_DURATION_BUCKET_MS.fifteenMin) {
    return 'from5to15min';
  }
  if (durationMs < ADMIN_DURATION_BUCKET_MS.thirtyMin) {
    return 'from15to30min';
  }
  return 'over30min';
}

export function winnerLivesBucketId(lives: number): AdminWinnerLivesBucketId {
  if (lives <= 5) {
    return '1to5';
  }
  if (lives <= 10) {
    return '6to10';
  }
  if (lives <= 15) {
    return '11to15';
  }
  return '16plus';
}

export function rematchRate(rematchGameCount: number, gameCount: number): number | null {
  if (gameCount === 0) {
    return null;
  }
  return rematchGameCount / gameCount;
}

export function reportsPerGame(reportCount: number, gameCount: number): number | null {
  if (gameCount === 0) {
    return null;
  }
  return reportCount / gameCount;
}

export function fillOpponentMix(
  rows: readonly AdminOpponentMixDurationRow[],
): AdminOpponentMixDurationRow[] {
  const human = rows.find((row) => !row.hasBots);
  const withBots = rows.find((row) => row.hasBots);
  return [
    {
      hasBots: false,
      gameCount: human?.gameCount ?? 0,
      avgDurationMs: human?.avgDurationMs ?? null,
    },
    {
      hasBots: true,
      gameCount: withBots?.gameCount ?? 0,
      avgDurationMs: withBots?.avgDurationMs ?? null,
    },
  ];
}

export function fillOccupancyCounts(
  rows: readonly AdminOccupancyCountRow[],
): AdminOccupancyCountRow[] {
  const byOcc = new Map<number, number>();
  for (const row of rows) {
    byOcc.set(row.occupancy, row.gameCount);
  }
  return ADMIN_OCCUPANCY_KEYS.map((occupancy) => ({
    occupancy,
    gameCount: byOcc.get(occupancy) ?? 0,
  }));
}

export function fillOccupancyDurations(
  rows: readonly AdminOccupancyDurationRow[],
): AdminOccupancyDurationRow[] {
  const byOcc = new Map<number, AdminOccupancyDurationRow>();
  for (const row of rows) {
    byOcc.set(row.occupancy, row);
  }
  return ADMIN_OCCUPANCY_KEYS.map((occupancy) => {
    const found = byOcc.get(occupancy);
    return (
      found ?? {
        occupancy,
        gameCount: 0,
        avgDurationMs: null,
        avgTurnSequence: null,
      }
    );
  });
}

export function fillLeaveRates(rows: readonly AdminLeaveRateRow[]): AdminLeaveRateRow[] {
  const byOcc = new Map<number, AdminLeaveRateRow>();
  for (const row of rows) {
    byOcc.set(row.occupancy, row);
  }
  return ADMIN_OCCUPANCY_KEYS.map((occupancy) => {
    const found = byOcc.get(occupancy);
    return (
      found ?? {
        occupancy,
        gameCount: 0,
        leaveGameCount: 0,
        inactivityGameCount: 0,
      }
    );
  });
}

export function fillHoursUtc(rows: readonly AdminHourCountRow[]): AdminHourCountRow[] {
  const byHour = new Map<number, number>();
  for (const row of rows) {
    byHour.set(row.hour, row.gameCount);
  }
  const out: AdminHourCountRow[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    out.push({ hour, gameCount: byHour.get(hour) ?? 0 });
  }
  return out;
}

export function fillElimReasons(rows: readonly AdminReasonCountRow[]): AdminReasonCountRow[] {
  const byReason = new Map<string, number>();
  for (const row of rows) {
    byReason.set(row.reason, row.count);
  }
  return ADMIN_ELIM_REASON_IDS.map((reason) => ({
    reason,
    count: byReason.get(reason) ?? 0,
  }));
}

export function fillFeedbackKinds(rows: readonly AdminKindCountRow[]): AdminKindCountRow[] {
  const byKind = new Map<FeedbackKind, number>();
  for (const row of rows) {
    byKind.set(row.kind, row.count);
  }
  return FEEDBACK_KINDS.map((kind) => ({
    kind,
    count: byKind.get(kind) ?? 0,
  }));
}

export function fillDurationBuckets(
  counts: Readonly<Record<AdminDurationBucketId, number>>,
): { bucket: AdminDurationBucketId; count: number }[] {
  return ADMIN_DURATION_BUCKET_IDS.map((bucket) => ({
    bucket,
    count: counts[bucket],
  }));
}

export function fillWinnerLivesBuckets(
  counts: Readonly<Record<AdminWinnerLivesBucketId, number>>,
): { bucket: AdminWinnerLivesBucketId; count: number }[] {
  return ADMIN_WINNER_LIVES_BUCKET_IDS.map((bucket) => ({
    bucket,
    count: counts[bucket],
  }));
}

export function isAdminElimReason(value: string): value is AdminElimReasonId {
  return (ADMIN_ELIM_REASON_IDS as readonly string[]).includes(value);
}
