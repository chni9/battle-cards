/**
 * Admin HTTP JSON shapes (Lot 61 / Lot 62) — technical spec v6 §14–§15.
 * Password-gated; seed may appear on game rows only.
 */

import type { KitId } from '../domain/kit';
import type { FeedbackKind } from '../feedback/report';
import type { GameExportLogView } from '../protocol/state-view';

export const ADMIN_OCCUPANCY_KEYS = [2, 3, 4, 5, 6, 7, 8] as const;
export type AdminOccupancyKey = (typeof ADMIN_OCCUPANCY_KEYS)[number];

export const ADMIN_DURATION_BUCKET_IDS = [
  'under5min',
  'from5to15min',
  'from15to30min',
  'over30min',
] as const;
export type AdminDurationBucketId = (typeof ADMIN_DURATION_BUCKET_IDS)[number];

export const ADMIN_WINNER_LIVES_BUCKET_IDS = ['1to5', '6to10', '11to15', '16plus'] as const;
export type AdminWinnerLivesBucketId = (typeof ADMIN_WINNER_LIVES_BUCKET_IDS)[number];

export const ADMIN_ELIM_REASON_IDS = ['combat', 'absence', 'inactivity', 'leave'] as const;
export type AdminElimReasonId = (typeof ADMIN_ELIM_REASON_IDS)[number];

export const ADMIN_DURATION_BUCKET_MS = {
  fiveMin: 5 * 60_000,
  fifteenMin: 15 * 60_000,
  thirtyMin: 30 * 60_000,
} as const;

export interface AdminOccupancyCountRow {
  occupancy: number;
  gameCount: number;
}

export interface AdminOccupancyDurationRow {
  occupancy: number;
  gameCount: number;
  avgDurationMs: number | null;
  avgTurnSequence: number | null;
}

export interface AdminOpponentMixDurationRow {
  hasBots: boolean;
  gameCount: number;
  avgDurationMs: number | null;
}

export interface AdminDayCountRow {
  day: string;
  gameCount: number;
}

export interface AdminHourCountRow {
  hour: number;
  gameCount: number;
}

export interface AdminReasonCountRow {
  reason: AdminElimReasonId;
  count: number;
}

export interface AdminLeaveRateRow {
  occupancy: number;
  gameCount: number;
  leaveGameCount: number;
  inactivityGameCount: number;
}

export interface AdminBucketCountRow {
  bucket: string;
  count: number;
}

export interface AdminKindCountRow {
  kind: FeedbackKind;
  count: number;
}

export interface AdminOverviewGeneral {
  gameCount: number;
  humanOnlyCount: number;
  withBotsCount: number;
  avgDurationMs: number | null;
  medianDurationMs: number | null;
  avgDurationMsPerHumanPlayer: number | null;
  avgTurnSequence: number | null;
  avgClockMsPerTurn: number | null;
  avgOccupancy: number | null;
  durationByOpponentMix: readonly AdminOpponentMixDurationRow[];
  durationByOccupancy: readonly AdminOccupancyDurationRow[];
  gamesByOccupancy: readonly AdminOccupancyCountRow[];
  topKitByWins: { kitId: KitId; wins: number } | null;
}

export interface AdminOverviewVolume {
  gamesByDay: readonly AdminDayCountRow[];
  gamesByHourUtc: readonly AdminHourCountRow[];
}

export interface AdminOverviewEndings {
  reasons: readonly AdminReasonCountRow[];
  leaveRateByOccupancy: readonly AdminLeaveRateRow[];
  avgWinnerLives: number | null;
  winnerLivesBuckets: readonly AdminBucketCountRow[];
  durationBuckets: readonly AdminBucketCountRow[];
}

export interface AdminOverviewRetention {
  rematchGameCount: number;
  rematchRate: number | null;
  distinctNicknames: number;
}

export interface AdminOverviewFeedbackPulse {
  reportCount: number;
  reportsPerGame: number | null;
  byKind: readonly AdminKindCountRow[];
}

export interface AdminOverview {
  gameCount: number;
  humanOnlyCount: number;
  withBotsCount: number;
  avgDurationMs: number | null;
  /** Weighted by human seat count per match (`duration × humans` / total human seats). */
  avgDurationMsPerHumanPlayer: number | null;
  avgTurnSequence: number | null;
  topKitByWins: { kitId: KitId; wins: number } | null;
  feedbackCount: number;
  /** Lot 62 match-level Overview modules. */
  general: AdminOverviewGeneral;
  volume: AdminOverviewVolume;
  endings: AdminOverviewEndings;
  retention: AdminOverviewRetention;
  feedbackPulse: AdminOverviewFeedbackPulse;
}

export interface AdminGameListItem {
  /** `finished_games.id` — unique per match; `roomId` is reused on Play again. */
  id: string;
  roomId: string;
  endedAt: string;
  occupancy: number;
  winnerNickname: string | null;
  winnerKitId: KitId | null;
  durationMs: number;
  turnSequence: number;
  hasBots: boolean;
  isTutorial: boolean;
}

export interface AdminGamesPage {
  items: readonly AdminGameListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminGameSeat {
  playerId: string;
  seatIndex: number;
  nickname: string | null;
  kitId: KitId;
  lives: number;
  points: number;
  isWinner: boolean;
  isEliminated: boolean;
  isBot: boolean;
}

export interface AdminGameElimination {
  orderIndex: number;
  playerId: string;
  nickname: string | null;
  eliminatorPlayerId: string | null;
  reason: string;
}

export interface AdminGameDetail {
  id: string;
  roomId: string;
  mode: string;
  seed: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  turnSequence: number;
  hasBots: boolean;
  isTutorial: boolean;
  winnerPlayerId: string;
  winnerNickname: string | null;
  seats: readonly AdminGameSeat[];
  eliminations: readonly AdminGameElimination[];
  hasExportLog: boolean;
  /** Present when `hasExportLog`; admin-only Excel parity payload. */
  exportLog?: GameExportLogView;
}

export interface AdminKitStatRow {
  kitId: KitId;
  picks: number;
  wins: number;
  pickRate: number;
  winRate: number;
}

export interface AdminKitStats {
  sampleGames: number;
  rows: readonly AdminKitStatRow[];
}

export interface AdminTableColumn {
  name: string;
  dataType: string;
}

export interface AdminTablePage {
  table: string;
  columns: readonly AdminTableColumn[];
  rows: readonly Record<string, unknown>[];
  page: number;
  pageSize: number;
  total: number;
}
