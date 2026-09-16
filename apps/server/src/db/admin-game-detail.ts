/**
 * Single finished-game detail for admin (Lot 61).
 */

import type { AdminGameDetail, KitId } from '@card-battle/shared';
import type { Pool } from 'pg';

export async function loadAdminGameDetail(
  pool: Pool,
  roomId: string,
): Promise<AdminGameDetail | null> {
  const gameResult = await pool.query<{
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
    `SELECT room_id, mode, seed, winner_player_id, turn_sequence,
      started_at, ended_at, duration_ms, has_bots, is_tutorial, export_log
    FROM finished_games
    WHERE room_id = $1
    ORDER BY ended_at DESC
    LIMIT 1`,
    [roomId],
  );

  const game = gameResult.rows[0];
  if (game === undefined) {
    return null;
  }

  const gameIdResult = await pool.query<{ id: string }>(
    `SELECT id FROM finished_games WHERE room_id = $1 ORDER BY ended_at DESC LIMIT 1`,
    [roomId],
  );
  const gameId = gameIdResult.rows[0]?.id;
  if (gameId === undefined) {
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
    [gameId],
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
    [gameId],
  );

  const nicknameByPlayer = new Map(
    playersResult.rows.map((row) => [row.player_id, row.nickname]),
  );

  const winnerRow = playersResult.rows.find((row) => row.is_winner);

  return {
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
    hasExportLog: game.export_log !== null,
  };
}
