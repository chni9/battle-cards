/**
 * Server-only finished-game snapshot for the Postgres log (technical spec §3, L8-01).
 * Seed and full holdings must never leak into client views.
 */

import type { ActionLogEntryView, CardInstance, EliminationReason, GameMode, KitId } from '@card-battle/shared';

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
  players: readonly FinishedGamePlayerRecord[];
  eliminations: readonly FinishedGameEliminationRecord[];
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
  eliminations: readonly FinishedGameEliminationRecord[];
}
