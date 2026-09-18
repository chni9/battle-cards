/**
 * Admin dashboard aggregates (Lot 61).
 */

import type { AdminOverview, KitId } from '@card-battle/shared';
import type { Pool } from 'pg';

import {
  buildFinishedGamesWhere,
  type AdminFinishedGameFilters,
} from './admin-filters';

export async function loadAdminOverview(
  pool: Pool,
  filters: AdminFinishedGameFilters,
): Promise<AdminOverview> {
  const { whereSql, params } = buildFinishedGamesWhere(filters);

  const statsResult = await pool.query<{
    game_count: string;
    human_only: string;
    with_bots: string;
    avg_duration: string | null;
    avg_turns: string | null;
  }>(
    `SELECT
      COUNT(*)::text AS game_count,
      COUNT(*) FILTER (WHERE g.has_bots = false)::text AS human_only,
      COUNT(*) FILTER (WHERE g.has_bots = true)::text AS with_bots,
      AVG(g.duration_ms)::text AS avg_duration,
      AVG(g.turn_sequence)::text AS avg_turns
    FROM finished_games g
    ${whereSql}`,
    params,
  );

  const row = statsResult.rows[0];
  const gameCount = Number.parseInt(row?.game_count ?? '0', 10);

  const perHumanResult = await pool.query<{
    weighted_ms: string | null;
    human_seats: string | null;
  }>(
    `SELECT
      SUM(g.duration_ms * h.human_count)::text AS weighted_ms,
      SUM(h.human_count)::text AS human_seats
    FROM finished_games g
    INNER JOIN (
      SELECT game_id, COUNT(*)::int AS human_count
      FROM finished_game_players
      WHERE is_bot = false
      GROUP BY game_id
    ) h ON h.game_id = g.id AND h.human_count > 0
    ${whereSql}`,
    params,
  );

  const perHumanRow = perHumanResult.rows[0];
  const humanSeats = Number.parseInt(perHumanRow?.human_seats ?? '0', 10);
  const weightedMs =
    perHumanRow?.weighted_ms === null || perHumanRow?.weighted_ms === undefined
      ? null
      : Number.parseFloat(perHumanRow.weighted_ms);

  const topKitResult = await pool.query<{ kit_id: string; wins: string }>(
    `SELECT p.kit_id, COUNT(*)::text AS wins
    FROM finished_games g
    JOIN finished_game_players p ON p.game_id = g.id AND p.is_winner = true
    ${whereSql}
    GROUP BY p.kit_id
    ORDER BY COUNT(*) DESC
    LIMIT 1`,
    params,
  );

  const topRow = topKitResult.rows[0];
  const topKitByWins =
    topRow === undefined
      ? null
      : {
          kitId: topRow.kit_id as KitId,
          wins: Number.parseInt(topRow.wins, 10),
        };

  const feedbackParams: unknown[] = [];
  const feedbackClauses: string[] = ['1=1'];
  if (filters.endedFrom !== undefined) {
    feedbackParams.push(filters.endedFrom.toISOString());
    feedbackClauses.push(`created_at >= $${String(feedbackParams.length)}`);
  }
  if (filters.endedTo !== undefined) {
    feedbackParams.push(filters.endedTo.toISOString());
    feedbackClauses.push(`created_at <= $${String(feedbackParams.length)}`);
  }

  const feedbackResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM feedback_reports WHERE ${feedbackClauses.join(' AND ')}`,
    feedbackParams,
  );

  const avgDurationRaw = row?.avg_duration;
  const avgTurnsRaw = row?.avg_turns;

  return {
    gameCount,
    humanOnlyCount: Number.parseInt(row?.human_only ?? '0', 10),
    withBotsCount: Number.parseInt(row?.with_bots ?? '0', 10),
    avgDurationMs:
      avgDurationRaw === null || avgDurationRaw === undefined
        ? null
        : Math.round(Number.parseFloat(avgDurationRaw)),
    avgDurationMsPerHumanPlayer:
      weightedMs === null || humanSeats === 0
        ? null
        : Math.round(weightedMs / humanSeats),
    avgTurnSequence:
      avgTurnsRaw === null || avgTurnsRaw === undefined
        ? null
        : Math.round(Number.parseFloat(avgTurnsRaw)),
    topKitByWins,
    feedbackCount: Number.parseInt(feedbackResult.rows[0]?.count ?? '0', 10),
  };
}
