/**
 * One transactional write of a finished game (technical spec §3, L8-02).
 * Failures are logged and never rethrown to the room.
 */

import type { Pool, PoolClient } from 'pg';

import type { FinishedGameSnapshot } from './finished-game-types';
import { getPool } from './pool';

function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

function logPersistSkip(message: string, error?: unknown): void {
  if (isProduction()) {
    console.error(`[db] ${message}`, error ?? '');
    return;
  }

  console.warn(`[db] ${message}`, error ?? '');
}

/**
 * Fire-and-forget safe: never throws. Soft-skips when DATABASE_URL is unset.
 */
export async function persistFinishedGame(snapshot: FinishedGameSnapshot): Promise<void> {
  const pool = getPool();

  if (pool === null) {
    logPersistSkip('DATABASE_URL unset — finished game not persisted');
    return;
  }

  try {
    await writeFinishedGame(pool, snapshot);
  } catch (error: unknown) {
    logPersistSkip('finished-game write failed', error);
  }
}

export async function writeFinishedGame(pool: Pool, snapshot: FinishedGameSnapshot): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await insertFinishedGame(client, snapshot);
    await client.query('COMMIT');
  } catch (error: unknown) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Client may already be dead; release in finally.
    }

    throw error;
  } finally {
    client.release();
  }
}

async function insertFinishedGame(client: PoolClient, snapshot: FinishedGameSnapshot): Promise<void> {
  const gameResult = await client.query<{ id: string }>(
    `INSERT INTO finished_games (
      room_id, mode, seed, winner_player_id, turn_sequence,
      started_at, ended_at, duration_ms, action_log, has_bots
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id`,
    [
      snapshot.roomId,
      snapshot.mode,
      snapshot.seed,
      snapshot.winnerPlayerId,
      snapshot.turnSequence,
      snapshot.startedAt.toISOString(),
      snapshot.endedAt.toISOString(),
      snapshot.durationMs,
      JSON.stringify(snapshot.actionLog),
      snapshot.hasBots,
    ],
  );

  const gameId = gameResult.rows[0]?.id;

  if (gameId === undefined) {
    throw new Error('finished_games insert returned no id');
  }

  for (const player of snapshot.players) {
    await client.query(
      `INSERT INTO finished_game_players (
        game_id, player_id, seat_index, kit_id, is_winner, is_eliminated,
        lives, points, upgrade_points, shield, shield_is_upgraded,
        hand, special_cards, cards_played_count, cards_played_by_id,
        buy_count, sell_count, upgrade_count, is_bot, bot_difficulty
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19, $20
      )`,
      [
        gameId,
        player.playerId,
        player.seatIndex,
        player.kitId,
        player.isWinner,
        player.isEliminated,
        player.lives,
        player.points,
        player.upgradePoints,
        player.shield,
        player.shieldIsUpgraded,
        JSON.stringify(player.hand),
        JSON.stringify(player.specialCards),
        player.cardsPlayedCount,
        JSON.stringify(player.cardsPlayedById),
        player.buyCount,
        player.sellCount,
        player.upgradeCount,
        player.isBot,
        player.botDifficulty,
      ],
    );
  }

  for (const [orderIndex, elimination] of snapshot.eliminations.entries()) {
    await client.query(
      `INSERT INTO finished_game_eliminations (
        game_id, order_index, player_id, eliminator_player_id, reason
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        gameId,
        orderIndex,
        elimination.playerId,
        elimination.eliminatorPlayerId,
        elimination.reason,
      ],
    );
  }
}
