/**
 * Lot 62 actor-level Overview series (Gameplay, Economy, Combat, Hidden, Bots).
 * Match mix still selects games; `actors` filters seats / action joins.
 */

import {
  ADMIN_OVERVIEW_PERSISTENT_IDS,
  ATTACK_CARD_IDS,
  SPECIAL_ATTACK_CARD_IDS,
  SPECIAL_CARD_IDS,
  fillBotDifficulties,
  fillCombatOutcomes,
  fillPersistentOverview,
  fillPlayedActions,
  fillSeatWinShare,
  fillSharedCardCounts,
  fillShopMix,
  fillSpecialCardCounts,
  isAdminBotDifficultyBucket,
  isAdminPlayedAction,
  isAdminShopMixAction,
  isKitId,
  isSpecialCardId,
  safeRatio,
  SHARED_CARD_IDS,
  type AdminCardCountRow,
  type AdminKitStatRow,
  type AdminOverviewBotsSeats,
  type AdminOverviewCombat,
  type AdminOverviewEconomy,
  type AdminOverviewGameplay,
  type AdminOverviewHidden,
  type AdminOverviewPersistentId,
  type AdminPlayedActionRow,
  type CardId,
} from '@card-battle/shared';
import type { Pool } from 'pg';

import {
  actorSeatAnd,
  type AdminFinishedGameFilters,
} from './admin-filters';

function sqlStringList(ids: readonly string[]): string {
  return ids.map((id) => `'${id}'`).join(', ');
}

const ATTACK_ID_SQL = sqlStringList([...ATTACK_CARD_IDS, ...SPECIAL_ATTACK_CARD_IDS]);
const SHARED_ID_SQL = sqlStringList([...SHARED_CARD_IDS]);
const SPECIAL_ID_SQL = sqlStringList([...SPECIAL_CARD_IDS]);
const PERSISTENT_ID_SQL = sqlStringList([...ADMIN_OVERVIEW_PERSISTENT_IDS]);

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

const SHARED_ID_SET = new Set<string>(SHARED_CARD_IDS);

function isSharedCardId(cardId: string): cardId is CardId {
  return SHARED_ID_SET.has(cardId);
}

function isOverviewPersistentId(value: string): value is AdminOverviewPersistentId {
  return (ADMIN_OVERVIEW_PERSISTENT_IDS as readonly string[]).includes(value);
}

export interface AdminOverviewActorModules {
  gameplay: AdminOverviewGameplay;
  economy: AdminOverviewEconomy;
  combat: AdminOverviewCombat;
  hidden: AdminOverviewHidden;
  botsSeats: AdminOverviewBotsSeats;
}

export async function loadAdminOverviewActors(
  pool: Pool,
  filters: AdminFinishedGameFilters,
  whereSql: string,
  params: unknown[],
): Promise<AdminOverviewActorModules> {
  const actorAnd = actorSeatAnd('p', filters.actors);
  const winnerAnd = actorSeatAnd('p', filters.actors);

  const [
    actionsResult,
    kitSampleResult,
    kitStatsResult,
    cardsPlayedResult,
    seatResult,
    upgradedResult,
    combatResult,
    hiddenResult,
    persistentsResult,
    mixedHumanResult,
    botDiffResult,
    seatWinResult,
  ] = await Promise.all([
    pool.query<{ action: string; n: string }>(
      `-- overview_actor_actions
      SELECT ev->>'action' AS action, COUNT(*)::text AS n
      FROM finished_games g
      CROSS JOIN LATERAL jsonb_array_elements(g.action_log) ev
      JOIN finished_game_players p
        ON p.game_id = g.id AND p.player_id = ev->>'actorPlayerId'
      ${whereSql}
        AND ev->>'kind' = 'actionPlayed'
        ${actorAnd}
      GROUP BY 1`,
      params,
    ),
    pool.query<{ count: string }>(
      `-- overview_actor_kit_sample
      SELECT COUNT(DISTINCT g.id)::text AS count
      FROM finished_games g
      JOIN finished_game_players p ON p.game_id = g.id
      ${whereSql}
        ${actorAnd}`,
      params,
    ),
    pool.query<{ kit_id: string; picks: string; wins: string }>(
      `-- overview_actor_kits
      SELECT p.kit_id,
        COUNT(*)::text AS picks,
        COUNT(*) FILTER (WHERE p.is_winner)::text AS wins
      FROM finished_game_players p
      INNER JOIN finished_games g ON g.id = p.game_id
      ${whereSql}
        ${actorAnd}
      GROUP BY p.kit_id
      ORDER BY p.kit_id ASC`,
      params,
    ),
    pool.query<{ card_id: string; played: string }>(
      `-- overview_cards_played_by_id
      SELECT kv.key AS card_id, SUM(kv.value::int)::text AS played
      FROM finished_games g
      JOIN finished_game_players p ON p.game_id = g.id
      CROSS JOIN LATERAL jsonb_each_text(p.cards_played_by_id) kv
      ${whereSql}
        ${actorAnd}
        AND kv.key IN (${SHARED_ID_SQL}, ${SPECIAL_ID_SQL})
      GROUP BY kv.key`,
      params,
    ),
    pool.query<{
      actor_seats: string;
      think_seats: string;
      avg_think: string | null;
      p50_think: string | null;
      p90_think: string | null;
      sum_think: string | null;
      think_actions: string | null;
      avg_lives: string | null;
      avg_points: string | null;
      avg_upgrade_points: string | null;
      avg_buy: string | null;
      avg_sell: string | null;
      avg_upgrade: string | null;
      avg_cards: string | null;
    }>(
      `-- overview_actor_seats
      SELECT
        COUNT(*)::text AS actor_seats,
        COUNT(p.think_time_ms)::text AS think_seats,
        AVG(p.think_time_ms)::text AS avg_think,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.think_time_ms)::text AS p50_think,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY p.think_time_ms)::text AS p90_think,
        SUM(p.think_time_ms)::text AS sum_think,
        SUM(acts.n) FILTER (WHERE p.think_time_ms IS NOT NULL)::text AS think_actions,
        AVG(p.lives)::text AS avg_lives,
        AVG(p.points)::text AS avg_points,
        AVG(p.upgrade_points)::text AS avg_upgrade_points,
        AVG(p.buy_count)::text AS avg_buy,
        AVG(p.sell_count)::text AS avg_sell,
        AVG(p.upgrade_count)::text AS avg_upgrade,
        AVG(p.cards_played_count)::text AS avg_cards
      FROM finished_games g
      JOIN finished_game_players p ON p.game_id = g.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS n
        FROM jsonb_array_elements(g.action_log) ev
        WHERE ev->>'kind' = 'actionPlayed'
          AND ev->>'actorPlayerId' = p.player_id
      ) acts ON true
      ${whereSql}
        ${actorAnd}`,
      params,
    ),
    pool.query<{
      play_or_multi: string;
      upgraded_plays: string;
    }>(
      `-- overview_upgraded_plays
      SELECT
        COUNT(*) FILTER (
          WHERE ev->>'action' IN ('playCard', 'playMultipleAttacks')
        )::text AS play_or_multi,
        COUNT(*) FILTER (
          WHERE (
            ev->>'action' = 'playCard' AND (ev->>'isUpgraded') = 'true'
          ) OR (
            ev->>'action' = 'playMultipleAttacks'
            AND (
              (ev->>'isUpgraded') = 'true'
              OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements(COALESCE(ev->'attacks', '[]'::jsonb)) atk
                WHERE (atk->>'isUpgraded') = 'true'
              )
            )
          )
        )::text AS upgraded_plays
      FROM finished_games g
      CROSS JOIN LATERAL jsonb_array_elements(g.action_log) ev
      JOIN finished_game_players p
        ON p.game_id = g.id AND p.player_id = ev->>'actorPlayerId'
      ${whereSql}
        AND ev->>'kind' = 'actionPlayed'
        ${actorAnd}`,
      params,
    ),
    pool.query<{
      lives_lost: string;
      shield: string;
      non_attack: string;
      o_applied: string;
      o_immune: string;
      o_cancelled: string;
      o_blocked: string;
    }>(
      `-- overview_attack_lives_lost
      SELECT
        COALESCE(SUM((ev->>'livesLost')::int) FILTER (
          WHERE ev->>'cardId' IN (${ATTACK_ID_SQL})
        ), 0)::text AS lives_lost,
        COALESCE(SUM((ev->>'shieldAbsorbed')::int) FILTER (
          WHERE ev->>'cardId' IN (${ATTACK_ID_SQL})
        ), 0)::text AS shield,
        COALESCE(SUM((ev->>'livesLost')::int) FILTER (
          WHERE ev->>'cardId' NOT IN (${ATTACK_ID_SQL})
        ), 0)::text AS non_attack,
        COUNT(*) FILTER (
          WHERE ev->>'cardId' IN (${ATTACK_ID_SQL}) AND ev->>'outcome' = 'applied'
        )::text AS o_applied,
        COUNT(*) FILTER (
          WHERE ev->>'cardId' IN (${ATTACK_ID_SQL}) AND ev->>'outcome' = 'immune'
        )::text AS o_immune,
        COUNT(*) FILTER (
          WHERE ev->>'cardId' IN (${ATTACK_ID_SQL}) AND ev->>'outcome' = 'cancelled'
        )::text AS o_cancelled,
        COUNT(*) FILTER (
          WHERE ev->>'cardId' IN (${ATTACK_ID_SQL}) AND ev->>'outcome' = 'blocked'
        )::text AS o_blocked
      FROM finished_games g
      CROSS JOIN LATERAL jsonb_array_elements(g.action_log) ev
      JOIN finished_game_players p
        ON p.game_id = g.id AND p.player_id = ev->>'sourcePlayerId'
      ${whereSql}
        AND ev->>'kind' = 'actionResolved'
        ${actorAnd}`,
      params,
    ),
    pool.query<{
      spy_plays: string;
      thief_plays: string;
      unspy: string;
      mirror_redirects: string;
    }>(
      `-- overview_hidden_tools
      SELECT
        COUNT(*) FILTER (
          WHERE ev->>'kind' = 'actionPlayed' AND ev->>'cardId' = 'spy'
        )::text AS spy_plays,
        COUNT(*) FILTER (
          WHERE ev->>'kind' = 'actionPlayed' AND ev->>'cardId' = 'thief'
        )::text AS thief_plays,
        COUNT(*) FILTER (
          WHERE ev->>'kind' = 'actionPlayed' AND ev->>'action' = 'clearSpy'
        )::text AS unspy,
        COUNT(*) FILTER (WHERE ev->>'kind' = 'mirrorRedirected')::text AS mirror_redirects
      FROM finished_games g
      CROSS JOIN LATERAL jsonb_array_elements(g.action_log) ev
      JOIN finished_game_players p
        ON p.game_id = g.id AND p.player_id = ev->>'actorPlayerId'
      ${whereSql}
        AND ev->>'kind' IN ('actionPlayed', 'mirrorRedirected')
        ${actorAnd}`,
      params,
    ),
    pool.query<{ card_id: string; plays: string; deacts: string }>(
      `-- overview_persistents
      SELECT ev->>'cardId' AS card_id,
        COUNT(*) FILTER (WHERE ev->>'kind' = 'actionPlayed')::text AS plays,
        COUNT(*) FILTER (WHERE ev->>'kind' = 'persistentDeactivated')::text AS deacts
      FROM finished_games g
      CROSS JOIN LATERAL jsonb_array_elements(g.action_log) ev
      JOIN finished_game_players p ON p.game_id = g.id AND (
        (ev->>'kind' = 'actionPlayed' AND p.player_id = ev->>'actorPlayerId')
        OR (ev->>'kind' = 'persistentDeactivated' AND p.player_id = ev->>'ownerPlayerId')
      )
      ${whereSql}
        AND ev->>'kind' IN ('actionPlayed', 'persistentDeactivated')
        AND ev->>'cardId' IN (${PERSISTENT_ID_SQL})
        ${actorAnd}
      GROUP BY 1`,
      params,
    ),
    pool.query<{ mixed_games: string; human_wins: string }>(
      `-- overview_mixed_human_wins
      SELECT
        COUNT(*) FILTER (WHERE g.has_bots)::text AS mixed_games,
        COUNT(*) FILTER (WHERE g.has_bots AND p.is_bot = false)::text AS human_wins
      FROM finished_games g
      JOIN finished_game_players p ON p.game_id = g.id AND p.is_winner = true
      ${whereSql}`,
      params,
    ),
    pool.query<{ difficulty: string; game_count: string; wins: string }>(
      `-- overview_bot_difficulty
      SELECT difficulty, COUNT(*)::text AS game_count,
        COUNT(*) FILTER (WHERE bot_won)::text AS wins
      FROM (
        SELECT g.id,
          CASE
            WHEN COUNT(DISTINCT p.bot_difficulty) FILTER (WHERE p.is_bot) = 1
              AND MIN(p.bot_difficulty) FILTER (WHERE p.is_bot) IS NOT NULL
            THEN MIN(p.bot_difficulty) FILTER (WHERE p.is_bot)
            ELSE 'mixed'
          END AS difficulty,
          BOOL_OR(p.is_winner AND p.is_bot) AS bot_won
        FROM finished_games g
        JOIN finished_game_players p ON p.game_id = g.id
        ${whereSql}
        GROUP BY g.id
        HAVING BOOL_OR(p.is_bot)
      ) bot_mix
      GROUP BY difficulty`,
      params,
    ),
    pool.query<{ seat_index: string; wins: string; game_count: string }>(
      `-- overview_seat_wins
      SELECT p.seat_index::text AS seat_index,
        COUNT(*) FILTER (WHERE p.is_winner${winnerAnd})::text AS wins,
        COUNT(DISTINCT g.id)::text AS game_count
      FROM finished_games g
      JOIN finished_game_players p ON p.game_id = g.id
      ${whereSql}
      GROUP BY p.seat_index`,
      params,
    ),
  ]);

  const actionRows: AdminPlayedActionRow[] = actionsResult.rows.flatMap((row) =>
    isAdminPlayedAction(row.action) ? [{ action: row.action, count: parseCount(row.n) }] : [],
  );
  const actions = fillPlayedActions(actionRows);
  const actionTotal = actions.reduce((sum, row) => sum + row.count, 0);
  const drawCount = actions.find((row) => row.action === 'draw')?.count ?? 0;
  const upgradeCardCount = actions.find((row) => row.action === 'upgradeCard')?.count ?? 0;
  const shopMix = fillShopMix(
    actionRows.flatMap((row) =>
      isAdminShopMixAction(row.action) ? [{ action: row.action, count: row.count }] : [],
    ),
  );

  let totalPicks = 0;
  const kitParsed: AdminKitStatRow[] = [];
  for (const row of kitStatsResult.rows) {
    if (!isKitId(row.kit_id)) {
      continue;
    }
    const picks = parseCount(row.picks);
    const wins = parseCount(row.wins);
    totalPicks += picks;
    kitParsed.push({
      kitId: row.kit_id,
      picks,
      wins,
      pickRate: 0,
      winRate: picks === 0 ? 0 : wins / picks,
    });
  }
  const kits = kitParsed.map((row) => ({
    ...row,
    pickRate: totalPicks === 0 ? 0 : row.picks / totalPicks,
  }));

  const specialRows: AdminCardCountRow[] = [];
  const sharedRows: AdminCardCountRow[] = [];
  for (const row of cardsPlayedResult.rows) {
    const count = parseCount(row.played);
    if (isSpecialCardId(row.card_id)) {
      specialRows.push({ cardId: row.card_id, count });
    } else if (isSharedCardId(row.card_id)) {
      sharedRows.push({ cardId: row.card_id, count });
    }
  }

  const seatRow = seatResult.rows[0];
  const actorSeatCount = parseCount(seatRow?.actor_seats);
  const thinkTimeSeatCount = parseCount(seatRow?.think_seats);
  const sumThink = parseRounded(seatRow?.sum_think);
  const thinkActions = parseCount(seatRow?.think_actions);

  const upgradedRow = upgradedResult.rows[0];
  const playCardOrMultiCount = parseCount(upgradedRow?.play_or_multi);
  const upgradedPlayCount = parseCount(upgradedRow?.upgraded_plays);

  const combatRow = combatResult.rows[0];
  const hiddenRow = hiddenResult.rows[0];
  const mixedRow = mixedHumanResult.rows[0];
  const mixedGameCount = parseCount(mixedRow?.mixed_games);
  const humanWinsInMixed = parseCount(mixedRow?.human_wins);

  return {
    gameplay: {
      actions,
      kits,
      kitSampleGames: parseCount(kitSampleResult.rows[0]?.count),
      specialsPlayed: fillSpecialCardCounts(specialRows),
      sharedCardsPlayed: fillSharedCardCounts(sharedRows),
      avgThinkTimeMs: parseRounded(seatRow?.avg_think),
      thinkTimePerActionMs:
        sumThink === null || thinkActions === 0 ? null : Math.round(sumThink / thinkActions),
      p50ThinkTimeMs: parseRounded(seatRow?.p50_think),
      p90ThinkTimeMs: parseRounded(seatRow?.p90_think),
      thinkTimeSeatCount,
      actorSeatCount,
      thinkTimePartial: actorSeatCount > 0 && thinkTimeSeatCount < actorSeatCount,
      drawShare: safeRatio(drawCount, actionTotal),
    },
    economy: {
      shopMix,
      upgradeCardCount,
      upgradedPlayCount,
      playCardOrMultiCount,
      upgradedPlayShare: safeRatio(upgradedPlayCount, playCardOrMultiCount),
      avgLeftoverLives: parseRounded(seatRow?.avg_lives),
      avgLeftoverPoints: parseRounded(seatRow?.avg_points),
      avgLeftoverUpgradePoints: parseRounded(seatRow?.avg_upgrade_points),
      avgBuyCount: parseRounded(seatRow?.avg_buy),
      avgSellCount: parseRounded(seatRow?.avg_sell),
      avgUpgradeCount: parseRounded(seatRow?.avg_upgrade),
      avgCardsPlayed: parseRounded(seatRow?.avg_cards),
    },
    combat: {
      livesLost: parseCount(combatRow?.lives_lost),
      shieldAbsorbed: parseCount(combatRow?.shield),
      nonAttackLivesLost: parseCount(combatRow?.non_attack),
      outcomes: fillCombatOutcomes([
        { outcome: 'applied', count: parseCount(combatRow?.o_applied) },
        { outcome: 'immune', count: parseCount(combatRow?.o_immune) },
        { outcome: 'cancelled', count: parseCount(combatRow?.o_cancelled) },
        { outcome: 'blocked', count: parseCount(combatRow?.o_blocked) },
      ]),
    },
    hidden: {
      spyPlays: parseCount(hiddenRow?.spy_plays),
      thiefPlays: parseCount(hiddenRow?.thief_plays),
      unspyCount: parseCount(hiddenRow?.unspy),
      mirrorRedirects: parseCount(hiddenRow?.mirror_redirects),
      persistents: fillPersistentOverview(
        persistentsResult.rows.flatMap((row) =>
          isOverviewPersistentId(row.card_id)
            ? [
                {
                  cardId: row.card_id,
                  plays: parseCount(row.plays),
                  deactivations: parseCount(row.deacts),
                },
              ]
            : [],
        ),
      ),
    },
    botsSeats: {
      mixedGameCount,
      humanWinsInMixed,
      humanWinRateInMixed: safeRatio(humanWinsInMixed, mixedGameCount),
      byBotDifficulty: fillBotDifficulties(
        botDiffResult.rows.flatMap((row) =>
          isAdminBotDifficultyBucket(row.difficulty)
            ? [
                {
                  difficulty: row.difficulty,
                  gameCount: parseCount(row.game_count),
                  wins: parseCount(row.wins),
                },
              ]
            : [],
        ),
      ),
      seatWinShare: fillSeatWinShare(
        seatWinResult.rows.map((row) => ({
          seatIndex: parseCount(row.seat_index),
          wins: parseCount(row.wins),
          gameCount: parseCount(row.game_count),
        })),
      ),
    },
  };
}

/** Attack-resolution card ids used in combat SQL (golden rule 2). */
export function overviewAttackCardIdSql(): string {
  return ATTACK_ID_SQL;
}
