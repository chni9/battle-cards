/**
 * Single finished-game detail for admin (Lot 61).
 * Look up by `finished_games.id` — `room_id` is reused on Play again.
 */

import type { AdminGameDetail, GameExportLogView, KitId } from '@card-battle/shared';
import type { Pool } from 'pg';

/** Postgres uuid text form. Rejects room codes so a bad path is 404, not a 22P02 503. */
const FINISHED_GAME_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isFinishedGameId(value: string): boolean {
  return FINISHED_GAME_ID_PATTERN.test(value);
}

export async function loadAdminGameDetail(
  pool: Pool,
  gameId: string,
): Promise<AdminGameDetail | null> {
  const gameResult = await pool.query<{
    id: string;
    room_id: string;
    mode: string;
    seed: string;
    winner_player_id: string;
    turn_sequence: number;
    started_at: Date;
    ended_at: Date;
    duration_ms: number;
    has_bots: boolean;
    is_tutorial: boolean;
    export_log: unknown;
  }>(
    `SELECT id, room_id, mode, seed, winner_player_id, turn_sequence,
      started_at, ended_at, duration_ms, has_bots, is_tutorial, export_log
    FROM finished_games
    WHERE id = $1`,
    [gameId],
  );

  const game = gameResult.rows[0];
  if (game === undefined) {
    return null;
  }

  const playersResult = await pool.query<{
    player_id: string;
    seat_index: number;
    nickname: string | null;
    kit_id: string;
    lives: number;
    points: number;
    is_winner: boolean;
    is_eliminated: boolean;
    is_bot: boolean;
  }>(
    `SELECT player_id, seat_index, nickname, kit_id, lives, points,
      is_winner, is_eliminated, is_bot
    FROM finished_game_players
    WHERE game_id = $1
    ORDER BY seat_index ASC`,
    [game.id],
  );

  const elimResult = await pool.query<{
    order_index: number;
    player_id: string;
    eliminator_player_id: string | null;
    reason: string;
  }>(
    `SELECT order_index, player_id, eliminator_player_id, reason
    FROM finished_game_eliminations
    WHERE game_id = $1
    ORDER BY order_index ASC`,
    [game.id],
  );

  const nicknameByPlayer = new Map(
    playersResult.rows.map((row) => [row.player_id, row.nickname]),
  );

  const winnerRow = playersResult.rows.find((row) => row.is_winner);

  const hasExportLog = game.export_log !== null;
  const detail: AdminGameDetail = {
    id: game.id,
    roomId: game.room_id,
    mode: game.mode,
    seed: game.seed,
    startedAt: game.started_at.toISOString(),
    endedAt: game.ended_at.toISOString(),
    durationMs: game.duration_ms,
    turnSequence: game.turn_sequence,
    hasBots: game.has_bots,
    isTutorial: game.is_tutorial,
    winnerPlayerId: game.winner_player_id,
    winnerNickname: winnerRow?.nickname ?? null,
    seats: playersResult.rows.map((row) => ({
      playerId: row.player_id,
      seatIndex: row.seat_index,
      nickname: row.nickname,
      kitId: row.kit_id as KitId,
      lives: row.lives,
      points: row.points,
      isWinner: row.is_winner,
      isEliminated: row.is_eliminated,
      isBot: row.is_bot,
    })),
    eliminations: elimResult.rows.map((row) => ({
      orderIndex: row.order_index,
      playerId: row.player_id,
      nickname: nicknameByPlayer.get(row.player_id) ?? null,
      eliminatorPlayerId: row.eliminator_player_id,
      reason: row.reason,
    })),
    hasExportLog,
  };
  if (hasExportLog && game.export_log !== null) {
    detail.exportLog = game.export_log as GameExportLogView;
  }
  return detail;
}
