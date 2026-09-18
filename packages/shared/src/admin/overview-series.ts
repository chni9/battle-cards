/**
 * Overview bucket math (Lot 62 / technical spec v6 §15).
 * Shared so SQL aliases and charts use the same edges.
 */

import { ACTION_CARD_IDS, ATTACK_CARD_IDS, SPECIAL_CARD_IDS, type CardId } from '../domain/card';
import { FEEDBACK_KINDS, type FeedbackKind } from '../feedback/report';
import { ACTION_RESOLUTION_OUTCOMES, type ActionResolutionOutcome } from '../protocol/action-outcome';
import {
  ADMIN_BOT_DIFFICULTY_BUCKETS,
  ADMIN_DURATION_BUCKET_IDS,
  ADMIN_DURATION_BUCKET_MS,
  ADMIN_ELIM_REASON_IDS,
  ADMIN_OCCUPANCY_KEYS,
  ADMIN_OVERVIEW_PERSISTENT_IDS,
  ADMIN_PLAYED_ACTION_IDS,
  ADMIN_SEAT_INDEXES,
  ADMIN_SHOP_MIX_ACTION_IDS,
  ADMIN_WINNER_LIVES_BUCKET_IDS,
  type AdminBotDifficultyBucket,
  type AdminBotDifficultyRow,
  type AdminCardCountRow,
  type AdminCombatOutcomeRow,
  type AdminDurationBucketId,
  type AdminElimReasonId,
  type AdminHourCountRow,
  type AdminKindCountRow,
  type AdminLeaveRateRow,
  type AdminOccupancyCountRow,
  type AdminOccupancyDurationRow,
  type AdminOpponentMixDurationRow,
  type AdminPersistentRow,
  type AdminPlayedActionId,
  type AdminPlayedActionRow,
  type AdminReasonCountRow,
  type AdminSeatWinRow,
  type AdminShopMixActionId,
  type AdminShopMixRow,
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
  return safeRatio(rematchGameCount, gameCount);
}

export function safeRatio(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

/** Date-window reports divided by date-window finished games. Zero games → null. */
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

export function isAdminPlayedAction(value: string): value is AdminPlayedActionId {
  return (ADMIN_PLAYED_ACTION_IDS as readonly string[]).includes(value);
}

export function isAdminShopMixAction(value: string): value is AdminShopMixActionId {
  return (ADMIN_SHOP_MIX_ACTION_IDS as readonly string[]).includes(value);
}

export function isAdminBotDifficultyBucket(value: string): value is AdminBotDifficultyBucket {
  return (ADMIN_BOT_DIFFICULTY_BUCKETS as readonly string[]).includes(value);
}

export function isActionResolutionOutcome(value: string): value is ActionResolutionOutcome {
  return (ACTION_RESOLUTION_OUTCOMES as readonly string[]).includes(value);
}

export function fillPlayedActions(
  rows: readonly AdminPlayedActionRow[],
): AdminPlayedActionRow[] {
  const byAction = new Map<string, number>();
  for (const row of rows) {
    byAction.set(row.action, row.count);
  }
  return ADMIN_PLAYED_ACTION_IDS.map((action) => ({
    action,
    count: byAction.get(action) ?? 0,
  }));
}

export function fillShopMix(rows: readonly AdminShopMixRow[]): AdminShopMixRow[] {
  const byAction = new Map<string, number>();
  for (const row of rows) {
    byAction.set(row.action, row.count);
  }
  return ADMIN_SHOP_MIX_ACTION_IDS.map((action) => ({
    action,
    count: byAction.get(action) ?? 0,
  }));
}

export function fillCombatOutcomes(
  rows: readonly AdminCombatOutcomeRow[],
): AdminCombatOutcomeRow[] {
  const byOutcome = new Map<string, number>();
  for (const row of rows) {
    byOutcome.set(row.outcome, row.count);
  }
  return ACTION_RESOLUTION_OUTCOMES.map((outcome) => ({
    outcome,
    count: byOutcome.get(outcome) ?? 0,
  }));
}

export function fillSeatWinShare(rows: readonly AdminSeatWinRow[]): AdminSeatWinRow[] {
  const bySeat = new Map<number, AdminSeatWinRow>();
  for (const row of rows) {
    bySeat.set(row.seatIndex, row);
  }
  return ADMIN_SEAT_INDEXES.map((seatIndex) => {
    const found = bySeat.get(seatIndex);
    return found ?? { seatIndex, wins: 0, gameCount: 0 };
  });
}

export function fillBotDifficulties(
  rows: readonly AdminBotDifficultyRow[],
): AdminBotDifficultyRow[] {
  const byDifficulty = new Map<string, AdminBotDifficultyRow>();
  for (const row of rows) {
    byDifficulty.set(row.difficulty, row);
  }
  return ADMIN_BOT_DIFFICULTY_BUCKETS.map((difficulty) => {
    const found = byDifficulty.get(difficulty);
    return found ?? { difficulty, gameCount: 0, wins: 0 };
  });
}

export function fillPersistentOverview(
  rows: readonly AdminPersistentRow[],
): AdminPersistentRow[] {
  const byCard = new Map<string, AdminPersistentRow>();
  for (const row of rows) {
    byCard.set(row.cardId, row);
  }
  return ADMIN_OVERVIEW_PERSISTENT_IDS.map((cardId) => {
    const found = byCard.get(cardId);
    return found ?? { cardId, plays: 0, deactivations: 0 };
  });
}

export function fillSharedCardCounts(rows: readonly AdminCardCountRow[]): AdminCardCountRow[] {
  return fillCardCounts([...ATTACK_CARD_IDS, ...ACTION_CARD_IDS], rows);
}

export function fillSpecialCardCounts(rows: readonly AdminCardCountRow[]): AdminCardCountRow[] {
  return fillCardCounts([...SPECIAL_CARD_IDS], rows);
}

function fillCardCounts(
  ids: readonly CardId[],
  rows: readonly AdminCardCountRow[],
): AdminCardCountRow[] {
  const byId = new Map<string, number>();
  for (const row of rows) {
    byId.set(row.cardId, row.count);
  }
  return ids.map((cardId) => ({
    cardId,
    count: byId.get(cardId) ?? 0,
  }));
}
