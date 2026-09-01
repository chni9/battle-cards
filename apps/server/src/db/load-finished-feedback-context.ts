/**
 * Public finished-game slice for feedback enrichment (L47-02).
 * Selects only room_id, is_tutorial, action_log — never seed.
 */

import type { Pool } from 'pg';
import type { PlayKind } from '@card-battle/shared';
import { FEEDBACK_LOG_TAIL_MAX } from '@card-battle/shared';

import { stripSeed } from '../http/strip-seed';

export const FINISHED_FEEDBACK_LOOKUP_SQL = `SELECT room_id, is_tutorial, action_log
FROM finished_games
WHERE room_id = $1
ORDER BY ended_at DESC
LIMIT 1`;

export interface FinishedFeedbackContext {
  gameCode: string;
  playKind: PlayKind;
  logTail: unknown;
}

export async function lookupFinishedFeedbackContext(
  pool: Pool,
  gameCode: string,
): Promise<FinishedFeedbackContext | null> {
  const result = await pool.query<{
    room_id: string;
    is_tutorial: boolean;
    action_log: unknown;
  }>(FINISHED_FEEDBACK_LOOKUP_SQL, [gameCode]);

  const row = result.rows[0];
  if (row === undefined) {
    return null;
  }

  const stripped = stripSeed(row.action_log);
  const logTail = Array.isArray(stripped)
    ? stripped.slice(-FEEDBACK_LOG_TAIL_MAX)
    : null;

  return {
    gameCode: row.room_id,
    playKind: row.is_tutorial ? 'tutorial' : 'classic',
    logTail,
  };
}
