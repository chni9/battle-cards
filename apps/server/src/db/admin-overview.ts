/**
 * Admin Overview aggregates (Lot 61 KPI cards + Lot 62 match-level modules).
 * Technical spec v6 §14–§15.
 */

import {
  ADMIN_DURATION_BUCKET_MS,
  fillDurationBuckets,
  fillElimReasons,
  fillFeedbackKinds,
  fillHoursUtc,
  fillLeaveRates,
  fillOccupancyCounts,
  fillOccupancyDurations,
  fillOpponentMix,
  fillWinnerLivesBuckets,
  isAdminElimReason,
  rematchRate,
  reportsPerGame,
  type AdminOverview,
  type AdminOverviewEndings,
  type AdminOverviewFeedbackPulse,
  type AdminOverviewGeneral,
  type AdminOverviewRetention,
  type AdminOverviewVolume,
  type FeedbackKind,
  type KitId,
} from '@card-battle/shared';
import type { Pool } from 'pg';

import {
  buildFinishedGamesWhere,
  type AdminFinishedGameFilters,
} from './admin-filters';
import { loadAdminOverviewActors } from './admin-overview-actors';

const OCC_JOIN = `LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS occ_n
  FROM finished_game_players ocp
  WHERE ocp.game_id = g.id
) occ ON true`;

function parseCount(raw: string | null | undefined): number {
  if (raw === null || raw === undefined || raw.length === 0) {
    return 0;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

function parseRounded(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw.length === 0) {
    return null;
  }
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function isFeedbackKindRow(value: string): value is FeedbackKind {
  return value === 'bug' || value === 'confusion' || value === 'idea';
}

export async function loadAdminOverview(
  pool: Pool,
  filters: AdminFinishedGameFilters,
): Promise<AdminOverview> {
  const { whereSql, params } = buildFinishedGamesWhere(filters);
  const mixFilters: AdminFinishedGameFilters = { ...filters, bots: 'all' };
  const mix = buildFinishedGamesWhere(mixFilters);

  const [general, volume, endings, retention, feedbackPulse, actors] = await Promise.all([
    loadGeneral(pool, whereSql, params, mix.whereSql, mix.params),
    loadVolume(pool, whereSql, params),
    loadEndings(pool, whereSql, params),
    loadRetention(pool, whereSql, params),
    loadFeedbackPulse(pool, filters),
    loadAdminOverviewActors(pool, filters, whereSql, params),
  ]);

  const feedbackWithRate: AdminOverviewFeedbackPulse = {
    ...feedbackPulse,
    reportsPerGame: reportsPerGame(feedbackPulse.reportCount, general.gameCount),
  };

  return {
    gameCount: general.gameCount,
    humanOnlyCount: general.humanOnlyCount,
    withBotsCount: general.withBotsCount,
    avgDurationMs: general.avgDurationMs,
    avgDurationMsPerHumanPlayer: general.avgDurationMsPerHumanPlayer,
    avgTurnSequence: general.avgTurnSequence,
    topKitByWins: general.topKitByWins,
    feedbackCount: feedbackWithRate.reportCount,
    general,
    volume,
    endings,
    retention,
    feedbackPulse: feedbackWithRate,
    gameplay: actors.gameplay,
    economy: actors.economy,
    combat: actors.combat,
    hidden: actors.hidden,
    botsSeats: actors.botsSeats,
  };
}

async function loadGeneral(
  pool: Pool,
  whereSql: string,
  params: unknown[],
  mixWhereSql: string,
  mixParams: unknown[],
): Promise<AdminOverviewGeneral> {
  const statsResult = await pool.query<{
    overview_game_count: string;
    overview_human_only: string;
    overview_with_bots: string;
    overview_avg_duration: string | null;
    overview_median_duration: string | null;
    overview_avg_turns: string | null;
    overview_avg_clock: string | null;
    overview_avg_occupancy: string | null;
  }>(
    `SELECT
      COUNT(*)::text AS overview_game_count,
      COUNT(*) FILTER (WHERE g.has_bots = false)::text AS overview_human_only,
      COUNT(*) FILTER (WHERE g.has_bots = true)::text AS overview_with_bots,
      AVG(g.duration_ms)::text AS overview_avg_duration,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY g.duration_ms)::text AS overview_median_duration,
      AVG(g.turn_sequence)::text AS overview_avg_turns,
      AVG(g.duration_ms::float / NULLIF(g.turn_sequence, 0))::text AS overview_avg_clock,
      AVG(occ.occ_n)::text AS overview_avg_occupancy
    FROM finished_games g
    ${OCC_JOIN}
    ${whereSql}`,
    params,
  );

  const row = statsResult.rows[0];
  const gameCount = parseCount(row?.overview_game_count);

  const [perHumanResult, topKitResult, mixResult, occupancyDurationResult] = await Promise.all([
      pool.query<{ weighted_ms: string | null; human_seats: string | null }>(
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
      ),
      pool.query<{ kit_id: string; wins: string }>(
        `SELECT p.kit_id, COUNT(*)::text AS wins
        FROM finished_games g
        JOIN finished_game_players p ON p.game_id = g.id AND p.is_winner = true
        ${whereSql}
        GROUP BY p.kit_id
        ORDER BY COUNT(*) DESC
        LIMIT 1`,
        params,
      ),
      pool.query<{ has_bots: boolean; game_count: string; avg_duration: string | null }>(
        `SELECT
          g.has_bots,
          COUNT(*)::text AS game_count,
          AVG(g.duration_ms)::text AS avg_duration
        FROM finished_games g
        ${mixWhereSql}
        GROUP BY g.has_bots`,
        mixParams,
      ),
      pool.query<{
        occupancy: string;
        game_count: string;
        avg_duration: string | null;
        avg_turns: string | null;
      }>(
        `SELECT
          occ.occ_n::text AS occupancy,
          COUNT(*)::text AS game_count,
          AVG(g.duration_ms)::text AS avg_duration,
          AVG(g.turn_sequence)::text AS avg_turns
        FROM finished_games g
        ${OCC_JOIN}
        ${whereSql}
        GROUP BY occ.occ_n`,
        params,
      ),
    ]);

  const perHumanRow = perHumanResult.rows[0];
  const humanSeats = parseCount(perHumanRow?.human_seats);
  const weightedRaw = perHumanRow?.weighted_ms;
  const weightedMs =
    weightedRaw === null || weightedRaw === undefined || weightedRaw.length === 0
      ? null
      : Number.parseFloat(weightedRaw);

  const topRow = topKitResult.rows[0];
  const topKitByWins =
    topRow === undefined
      ? null
      : {
          kitId: topRow.kit_id as KitId,
          wins: parseCount(topRow.wins),
        };

  return {
    gameCount,
    humanOnlyCount: parseCount(row?.overview_human_only),
    withBotsCount: parseCount(row?.overview_with_bots),
    avgDurationMs: parseRounded(row?.overview_avg_duration),
    medianDurationMs: parseRounded(row?.overview_median_duration),
    avgDurationMsPerHumanPlayer:
      weightedMs === null || !Number.isFinite(weightedMs) || humanSeats === 0
        ? null
        : Math.round(weightedMs / humanSeats),
    avgTurnSequence: parseRounded(row?.overview_avg_turns),
    avgClockMsPerTurn: parseRounded(row?.overview_avg_clock),
    avgOccupancy: parseRounded(row?.overview_avg_occupancy),
    durationByOpponentMix: fillOpponentMix(
      mixResult.rows.map((mixRow) => ({
        hasBots: mixRow.has_bots,
        gameCount: parseCount(mixRow.game_count),
        avgDurationMs: parseRounded(mixRow.avg_duration),
      })),
    ),
    durationByOccupancy: fillOccupancyDurations(
      occupancyDurationResult.rows.map((occRow) => ({
        occupancy: parseCount(occRow.occupancy),
        gameCount: parseCount(occRow.game_count),
        avgDurationMs: parseRounded(occRow.avg_duration),
        avgTurnSequence: parseRounded(occRow.avg_turns),
      })),
    ),
    gamesByOccupancy: fillOccupancyCounts(
      occupancyDurationResult.rows.map((occRow) => ({
        occupancy: parseCount(occRow.occupancy),
        gameCount: parseCount(occRow.game_count),
      })),
    ),
    topKitByWins,
  };
}

async function loadVolume(
  pool: Pool,
  whereSql: string,
  params: unknown[],
): Promise<AdminOverviewVolume> {
  const [dayResult, hourResult] = await Promise.all([
    pool.query<{ day: string; game_count: string }>(
      `SELECT (g.ended_at AT TIME ZONE 'UTC')::date::text AS day, COUNT(*)::text AS game_count
      FROM finished_games g
      ${whereSql}
      GROUP BY 1
      ORDER BY 1 ASC`,
      params,
    ),
    pool.query<{ hour: string; game_count: string }>(
      `SELECT EXTRACT(HOUR FROM g.ended_at AT TIME ZONE 'UTC')::int::text AS hour,
        COUNT(*)::text AS game_count
      FROM finished_games g
      ${whereSql}
      GROUP BY 1`,
      params,
    ),
  ]);

  return {
    gamesByDay: dayResult.rows.map((row) => ({
      day: row.day,
      gameCount: parseCount(row.game_count),
    })),
    gamesByHourUtc: fillHoursUtc(
      hourResult.rows.map((row) => ({
        hour: parseCount(row.hour),
        gameCount: parseCount(row.game_count),
      })),
    ),
  };
}

async function loadEndings(
  pool: Pool,
  whereSql: string,
  params: unknown[],
): Promise<AdminOverviewEndings> {
  const five = String(ADMIN_DURATION_BUCKET_MS.fiveMin);
  const fifteen = String(ADMIN_DURATION_BUCKET_MS.fifteenMin);
  const thirty = String(ADMIN_DURATION_BUCKET_MS.thirtyMin);

  const [reasonResult, leaveResult, winnerResult, durationResult] = await Promise.all([
    pool.query<{ reason: string; count: string }>(
      `SELECT e.reason, COUNT(*)::text AS count
      FROM finished_games g
      JOIN finished_game_eliminations e ON e.game_id = g.id
      ${whereSql}
      GROUP BY e.reason`,
      params,
    ),
    pool.query<{
      occupancy: string;
      game_count: string;
      leave_games: string;
      inactivity_games: string;
    }>(
      `SELECT
        occ.occ_n::text AS occupancy,
        COUNT(*)::text AS game_count,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM finished_game_eliminations e
            WHERE e.game_id = g.id AND e.reason = 'leave'
          )
        )::text AS leave_games,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM finished_game_eliminations e
            WHERE e.game_id = g.id AND e.reason = 'inactivity'
          )
        )::text AS inactivity_games
      FROM finished_games g
      ${OCC_JOIN}
      ${whereSql}
      GROUP BY occ.occ_n`,
      params,
    ),
    pool.query<{
      avg_lives: string | null;
      b_1to5: string;
      b_6to10: string;
      b_11to15: string;
      b_16plus: string;
    }>(
      `SELECT
        AVG(p.lives)::text AS avg_lives,
        COUNT(*) FILTER (WHERE p.lives <= 5)::text AS b_1to5,
        COUNT(*) FILTER (WHERE p.lives > 5 AND p.lives <= 10)::text AS b_6to10,
        COUNT(*) FILTER (WHERE p.lives > 10 AND p.lives <= 15)::text AS b_11to15,
        COUNT(*) FILTER (WHERE p.lives > 15)::text AS b_16plus
      FROM finished_games g
      JOIN finished_game_players p ON p.game_id = g.id AND p.is_winner = true
      ${whereSql}`,
      params,
    ),
    pool.query<{
      under5: string;
      from5to15: string;
      from15to30: string;
      over30: string;
    }>(
      `SELECT
        COUNT(*) FILTER (WHERE g.duration_ms < ${five})::text AS under5,
        COUNT(*) FILTER (WHERE g.duration_ms >= ${five} AND g.duration_ms < ${fifteen})::text AS from5to15,
        COUNT(*) FILTER (WHERE g.duration_ms >= ${fifteen} AND g.duration_ms < ${thirty})::text AS from15to30,
        COUNT(*) FILTER (WHERE g.duration_ms >= ${thirty})::text AS over30
      FROM finished_games g
      ${whereSql}`,
      params,
    ),
  ]);

  const winnerRow = winnerResult.rows[0];
  const durationRow = durationResult.rows[0];

  return {
    reasons: fillElimReasons(
      reasonResult.rows.flatMap((row) =>
        isAdminElimReason(row.reason)
          ? [{ reason: row.reason, count: parseCount(row.count) }]
          : [],
      ),
    ),
    leaveRateByOccupancy: fillLeaveRates(
      leaveResult.rows.map((row) => ({
        occupancy: parseCount(row.occupancy),
        gameCount: parseCount(row.game_count),
        leaveGameCount: parseCount(row.leave_games),
        inactivityGameCount: parseCount(row.inactivity_games),
      })),
    ),
    avgWinnerLives: parseRounded(winnerRow?.avg_lives),
    winnerLivesBuckets: fillWinnerLivesBuckets({
      '1to5': parseCount(winnerRow?.b_1to5),
      '6to10': parseCount(winnerRow?.b_6to10),
      '11to15': parseCount(winnerRow?.b_11to15),
      '16plus': parseCount(winnerRow?.b_16plus),
    }),
    durationBuckets: fillDurationBuckets({
      under5min: parseCount(durationRow?.under5),
      from5to15min: parseCount(durationRow?.from5to15),
      from15to30min: parseCount(durationRow?.from15to30),
      over30min: parseCount(durationRow?.over30),
    }),
  };
}

async function loadRetention(
  pool: Pool,
  whereSql: string,
  params: unknown[],
): Promise<AdminOverviewRetention> {
  const [rematchResult, nickResult] = await Promise.all([
    pool.query<{ overview_game_count: string; overview_rematch_count: string }>(
      `SELECT
        COUNT(*)::text AS overview_game_count,
        COUNT(*) FILTER (WHERE dup.n > 1)::text AS overview_rematch_count
      FROM finished_games g
      INNER JOIN (
        SELECT room_id, COUNT(*)::int AS n
        FROM finished_games
        GROUP BY room_id
      ) dup ON dup.room_id = g.room_id
      ${whereSql}`,
      params,
    ),
    pool.query<{ overview_nicknames: string }>(
      `SELECT COUNT(DISTINCT p.nickname)::text AS overview_nicknames
      FROM finished_games g
      JOIN finished_game_players p ON p.game_id = g.id
      ${whereSql}
        AND p.nickname IS NOT NULL
        AND length(p.nickname) > 0`,
      params,
    ),
  ]);

  const rematchRow = rematchResult.rows[0];
  const gameCount = parseCount(rematchRow?.overview_game_count);
  const rematchGameCount = parseCount(rematchRow?.overview_rematch_count);

  return {
    rematchGameCount,
    rematchRate: rematchRate(rematchGameCount, gameCount),
    distinctNicknames: parseCount(nickResult.rows[0]?.overview_nicknames),
  };
}

async function loadFeedbackPulse(
  pool: Pool,
  filters: AdminFinishedGameFilters,
): Promise<AdminOverviewFeedbackPulse> {
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
  const whereFeedback = feedbackClauses.join(' AND ');

  const [countResult, kindResult] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM feedback_reports WHERE ${whereFeedback}`,
      feedbackParams,
    ),
    pool.query<{ kind: string; count: string }>(
      `SELECT kind, COUNT(*)::text AS count
      FROM feedback_reports
      WHERE ${whereFeedback}
      GROUP BY kind`,
      feedbackParams,
    ),
  ]);

  const reportCount = parseCount(countResult.rows[0]?.count);

  return {
    reportCount,
    reportsPerGame: null,
    byKind: fillFeedbackKinds(
      kindResult.rows.flatMap((row) =>
        isFeedbackKindRow(row.kind) ? [{ kind: row.kind, count: parseCount(row.count) }] : [],
      ),
    ),
  };
}
