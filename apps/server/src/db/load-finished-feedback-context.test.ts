import { describe, expect, it, vi } from 'vitest';

import {
  FINISHED_FEEDBACK_LOOKUP_SQL,
  lookupFinishedFeedbackContext,
} from './load-finished-feedback-context';

describe('lookupFinishedFeedbackContext (L47-02)', () => {
  it('selects public columns only and never seed', () => {
    expect(FINISHED_FEEDBACK_LOOKUP_SQL).toContain('room_id');
    expect(FINISHED_FEEDBACK_LOOKUP_SQL).toContain('is_tutorial');
    expect(FINISHED_FEEDBACK_LOOKUP_SQL).toContain('action_log');
    expect(FINISHED_FEEDBACK_LOOKUP_SQL).not.toMatch(/\bseed\b/);
  });

  it('maps is_tutorial to playKind and slices the public log', async () => {
    const query = vi.fn(() =>
      Promise.resolve({
        rows: [
          {
            room_id: 'ABCDEF',
            is_tutorial: true,
            action_log: [
              { kind: 'actionPlayed', seed: 'nope' },
              { kind: 'actionResolved' },
            ],
          },
        ],
      }),
    );

    const found = await lookupFinishedFeedbackContext({ query } as never, 'ABCDEF');
    expect(found).toEqual({
      gameCode: 'ABCDEF',
      playKind: 'tutorial',
      logTail: [{ kind: 'actionPlayed' }, { kind: 'actionResolved' }],
    });
    expect(JSON.stringify(found)).not.toContain('seed');
    expect(query).toHaveBeenCalledWith(FINISHED_FEEDBACK_LOOKUP_SQL, ['ABCDEF']);
  });

  it('returns null when no finished row matches', async () => {
    const query = vi.fn(() => Promise.resolve({ rows: [] }));
    await expect(
      lookupFinishedFeedbackContext({ query } as never, 'ZZZZZZ'),
    ).resolves.toBeNull();
  });
});
