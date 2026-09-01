/**
 * Insert one tester feedback row (technical spec v6 §7.2 / L47-01).
 * Callers validate and strip seed before this helper.
 */

import type { Pool } from 'pg';

import type { FeedbackReportInsert } from './feedback-types';

export async function insertFeedbackReport(
  pool: Pool,
  report: FeedbackReportInsert,
): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO feedback_reports (
      kind, message, contact, nickname, game_code, screen,
      protocol_version, play_kind, log_tail, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id`,
    [
      report.kind,
      report.message,
      report.contact,
      report.nickname,
      report.gameCode,
      report.screen,
      report.protocolVersion,
      report.playKind,
      report.logTail === null ? null : JSON.stringify(report.logTail),
      report.userAgent,
    ],
  );

  const id = result.rows[0]?.id;
  if (id === undefined) {
    throw new Error('feedback_reports insert returned no id');
  }

  return id;
}
