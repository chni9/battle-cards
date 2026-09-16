/**
 * Admin HTTP JSON shapes (Lot 61) — technical spec v6 §14.
 * Password-gated; seed may appear on game rows only.
 */

import type { KitId } from '../domain/kit';

export interface AdminOverview {
  gameCount: number;
  humanOnlyCount: number;
  withBotsCount: number;
  avgDurationMs: number | null;
  avgTurnSequence: number | null;
  topKitByWins: { kitId: KitId; wins: number } | null;
  feedbackCount: number;
}

export interface AdminGameListItem {
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
