/**
 * Designer triage write (Lot 68). Status stays on the row; no seed column.
 */

import type { Pool } from 'pg';
import type { FeedbackTriageStatus } from '@card-battle/shared';

const FEEDBACK_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const UPDATE_FEEDBACK_STATUS_SQL = `UPDATE feedback_reports
SET status = $1
WHERE id = $2
RETURNING id`;

export function isFeedbackReportId(value: string): boolean {
  return FEEDBACK_ID.test(value);
}

/** True when a row was updated. Unknown id is false, not an error. */
export async function updateFeedbackStatus(
  pool: Pool,
  id: string,
  status: FeedbackTriageStatus,
): Promise<boolean> {
  if (!isFeedbackReportId(id)) {
    return false;
  }
  const result = await pool.query<{ id: string }>(UPDATE_FEEDBACK_STATUS_SQL, [status, id]);
  return result.rows.length === 1;
}
