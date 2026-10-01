import { describe, expect, it, vi } from 'vitest';

import {
  UPDATE_FEEDBACK_STATUS_SQL,
  isFeedbackReportId,
  updateFeedbackStatus,
} from './update-feedback-status';

const ID = '5067fa0f-825c-4f0a-b2c7-9a71cb805a28';

describe('updateFeedbackStatus (Lot 68)', () => {
  it('updates by id and never mentions seed', () => {
    expect(UPDATE_FEEDBACK_STATUS_SQL).toContain('SET status = $1');
    expect(UPDATE_FEEDBACK_STATUS_SQL).toContain('WHERE id = $2');
    expect(UPDATE_FEEDBACK_STATUS_SQL).not.toMatch(/\bseed\b/);
  });

  it('rejects a non-uuid before querying', async () => {
    const query = vi.fn();
    expect(isFeedbackReportId('RCCHCM')).toBe(false);
    expect(await updateFeedbackStatus({ query } as never, 'RCCHCM', 'done')).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it('returns true only when one row changes', async () => {
    const query = vi.fn(() => Promise.resolve({ rows: [{ id: ID }] }));
    expect(await updateFeedbackStatus({ query } as never, ID, 'eliminated')).toBe(true);
    expect(query).toHaveBeenCalledWith(UPDATE_FEEDBACK_STATUS_SQL, ['eliminated', ID]);

    query.mockResolvedValueOnce({ rows: [] });
    expect(await updateFeedbackStatus({ query } as never, ID, 'pending')).toBe(false);
  });
});
