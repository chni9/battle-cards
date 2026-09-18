/**
 * Paginated finished-game list for admin (Lot 61).
 */

import type { AdminGameListItem, AdminGamesPage, KitId } from '@card-battle/shared';
import type { Pool } from 'pg';

import {
  buildFinishedGamesWhere,
  type AdminFinishedGameFilters,
} from './admin-filters';

export async function loadAdminGamesPage(
  pool: Pool,
  filters: AdminFinishedGameFilters,
  page: number,
  pageSize: number,
  offset: number,
): Promise<AdminGamesPage> {
  const { whereSql, params } = buildFinishedGamesWhere(filters);

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM finished_games g ${whereSql}`,
    params,
  );
  const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10);

  const listParams = [...params, pageSize, offset];
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const listResult = await pool.query<{
    id: string;
    room_id: string;
    ended_at: Date;
    duration_ms: number;
    turn_sequence: number;
    has_bots: boolean;
    is_tutorial: boolean;
    occupancy: string;
    winner_nickname: string | null;
    winner_kit_id: string | null;
  }>(
    `SELECT
      g.id,
      g.room_id,
      g.ended_at,
      g.duration_ms,
      g.turn_sequence,
      g.has_bots,
      g.is_tutorial,
      (SELECT COUNT(*)::text FROM finished_game_players ocp WHERE ocp.game_id = g.id) AS occupancy,
      w.nickname AS winner_nickname,
      w.kit_id AS winner_kit_id
    FROM finished_games g
    LEFT JOIN finished_game_players w ON w.game_id = g.id AND w.is_winner = true
    ${whereSql}
    ORDER BY g.ended_at DESC
    LIMIT $${String(limitIdx)} OFFSET $${String(offsetIdx)}`,
    listParams,
  );

  const items: AdminGameListItem[] = listResult.rows.map((row) => ({
    id: row.id,
    roomId: row.room_id,
    endedAt: row.ended_at.toISOString(),
    occupancy: Number.parseInt(row.occupancy, 10),
    winnerNickname: row.winner_nickname,
    winnerKitId: row.winner_kit_id === null ? null : (row.winner_kit_id as KitId),
    durationMs: row.duration_ms,
    turnSequence: row.turn_sequence,
    hasBots: row.has_bots,
    isTutorial: row.is_tutorial,
  }));

  return { items, page, pageSize, total };
}
