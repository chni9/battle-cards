/**
 * Server-only finished-game snapshot for the Postgres log (technical spec §3, L8-01).
 * Seed and full holdings must never leak into client views.
 * Bot markers: technical spec v3 §9, L17-04.
 */

import type {
  ActionLogEntryView,
  BotDifficulty,
  CardInstance,
  EliminationReason,
  ExportTurnRowView,
  GameExportLogView,
  GameMode,
  KitId,
} from '@card-battle/shared';

export interface FinishedGameEliminationRecord {
  playerId: string;
  eliminatorPlayerId: string | null;
  reason: EliminationReason;
}

export interface FinishedGamePlayerRecord {
  playerId: string;
  seatIndex: number;
  kitId: KitId;
  isWinner: boolean;
  isEliminated: boolean;
  lives: number;
  points: number;
  upgradePoints: number;
  shield: number;
  shieldIsUpgraded: boolean;
  hand: readonly CardInstance[];
  specialCards: readonly CardInstance[];
  cardsPlayedCount: number;
  cardsPlayedById: Readonly<Record<string, number>>;
  buyCount: number;
  sellCount: number;
  upgradeCount: number;
  /** L17-04 — false for humans and for rows written before migration defaults. */
  isBot: boolean;
  /** L17-04 — set only when `isBot`; null for humans. */
  botDifficulty: BotDifficulty | null;
}

export interface FinishedGameSnapshot {
  roomId: string;
  mode: GameMode;
  seed: string;
  winnerPlayerId: string;
  turnSequence: number;
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
  actionLog: readonly ActionLogEntryView[];
  /**
   * Excel-parity payload (Turns + Events). Same shape as FinishedStateView.exportLog.
   * `events` matches `actionLog` on new writes.
   */
  exportLog: GameExportLogView;
  players: readonly FinishedGamePlayerRecord[];
  eliminations: readonly FinishedGameEliminationRecord[];
  /** L17-04 — true when any seat was a bot. */
  hasBots: boolean;
  /** L41-04 — true when the room overlay was tutorial. */
  isTutorial: boolean;
}

export interface BuildFinishedGameSnapshotInput {
  roomId: string;
  startedAtMs: number;
  endedAtMs: number;
  winnerPlayerId: string;
  gameState: {
    mode: GameMode;
    seed: string;
    turnSequence: number;
    players: readonly {
      id: string;
      kitId: KitId;
      lives: number;
      points: number;
      upgradePoints: number;
      shield: number;
      shieldIsUpgraded: boolean;
      hand: readonly CardInstance[];
      specialCards: readonly CardInstance[];
      isEliminated: boolean;
    }[];
  };
  actionLog: readonly ActionLogEntryView[];
  /** Lot 19 turn before/after rows — empty when unavailable (e.g. headless sim). */
  turnHistory?: readonly ExportTurnRowView[];
  eliminations: readonly FinishedGameEliminationRecord[];
  /**
   * Bot seat difficulties keyed by player id (L17-04).
   * Presence means the seat is a bot. Omit or empty → all-human defaults.
   */
  botDifficultiesByPlayerId?: ReadonlyMap<string, BotDifficulty>;
  /** L41-04 — default false so simulation callers omit it. */
  isTutorial?: boolean;
}
