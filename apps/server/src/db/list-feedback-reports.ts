/**
 * List tester feedback newest first (technical spec v6 §7.3 / L47-04).
 * SELECT never includes seed — the table has no seed column.
 */

import type { Pool } from 'pg';
import {
  isFeedbackKind,
  isFeedbackScreen,
  type FeedbackInboxRow,
  type PlayKind,
} from '@card-battle/shared';

import { stripSeed } from '../http/strip-seed';

export const LIST_FEEDBACK_REPORTS_SQL = `SELECT
  id, created_at, kind, message, contact, nickname, game_code, screen,
  protocol_version, play_kind, log_tail, user_agent
FROM feedback_reports
ORDER BY created_at DESC`;

interface FeedbackReportPgRow {
  id: string;
  created_at: Date | string;
  kind: string;
  message: string;
  contact: string | null;
  nickname: string | null;
  game_code: string | null;
  screen: string;
  protocol_version: number;
  play_kind: string | null;
  log_tail: unknown;
  user_agent: string | null;
}

function isoTimestamp(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function playKindOf(value: string | null): PlayKind | null {
  return value === 'classic' || value === 'tutorial' ? value : null;
}

export function mapFeedbackInboxRow(row: FeedbackReportPgRow): FeedbackInboxRow | null {
  if (!isFeedbackKind(row.kind) || !isFeedbackScreen(row.screen)) {
    return null;
  }
  return {
    id: row.id,
    createdAt: isoTimestamp(row.created_at),
    kind: row.kind,
    message: row.message,
    contact: row.contact,
    nickname: row.nickname,
    gameCode: row.game_code,
    screen: row.screen,
    protocolVersion: row.protocol_version,
    playKind: playKindOf(row.play_kind),
    logTail: row.log_tail === null ? null : stripSeed(row.log_tail),
    userAgent: row.user_agent,
  };
}

export async function listFeedbackReports(pool: Pool): Promise<FeedbackInboxRow[]> {
  const result = await pool.query<FeedbackReportPgRow>(LIST_FEEDBACK_REPORTS_SQL);
  const rows: FeedbackInboxRow[] = [];
  for (const row of result.rows) {
    const mapped = mapFeedbackInboxRow(row);
    if (mapped !== null) {
      rows.push(mapped);
    }
  }
  return rows;
}
