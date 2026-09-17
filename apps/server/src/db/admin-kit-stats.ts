/**
 * Kit pick/win rates for admin (Lot 61).
 */

import type { AdminKitStats, KitId } from '@card-battle/shared';
import type { Pool } from 'pg';

import {
  buildFinishedGamesWhere,
  type AdminFinishedGameFilters,
} from './admin-filters';

export async function loadAdminKitStats(
  pool: Pool,
  filters: AdminFinishedGameFilters,
): Promise<AdminKitStats> {
  const { whereSql, params } = buildFinishedGamesWhere(filters);

  const sampleResult = await pool.query<{ count: string }>(
    `SELECT COUNT(DISTINCT g.id)::text AS count
    FROM finished_games g
    ${whereSql}`,
    params,
  );
  const sampleGames = Number.parseInt(sampleResult.rows[0]?.count ?? '0', 10);

  const statsResult = await pool.query<{ kit_id: string; picks: string; wins: string }>(
    `SELECT p.kit_id,
      COUNT(*)::text AS picks,
      COUNT(*) FILTER (WHERE p.is_winner)::text AS wins
    FROM finished_game_players p
    INNER JOIN finished_games g ON g.id = p.game_id
    ${whereSql}
    GROUP BY p.kit_id
    ORDER BY p.kit_id ASC`,
    params,
  );

  let totalPicks = 0;
  for (const row of statsResult.rows) {
    totalPicks += Number.parseInt(row.picks, 10);
  }

  const rows = statsResult.rows.map((row) => {
    const picks = Number.parseInt(row.picks, 10);
    const wins = Number.parseInt(row.wins, 10);
    const pickRate = totalPicks === 0 ? 0 : picks / totalPicks;
    const winRate = picks === 0 ? 0 : wins / picks;
    return {
      kitId: row.kit_id as KitId,
      picks,
      wins,
      pickRate,
      winRate,
    };
  });

  return { sampleGames, rows };
}
