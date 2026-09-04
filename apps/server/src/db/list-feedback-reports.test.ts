import { describe, expect, it, vi } from 'vitest';

import {
  LIST_FEEDBACK_REPORTS_SQL,
  listFeedbackReports,
  mapFeedbackInboxRow,
} from './list-feedback-reports';

describe('listFeedbackReports (technical spec v6 §7.3 / L47-04)', () => {
  it('selects all columns newest first and never seed', () => {
    expect(LIST_FEEDBACK_REPORTS_SQL).toContain('ORDER BY created_at DESC');
    expect(LIST_FEEDBACK_REPORTS_SQL).toContain('log_tail');
    expect(LIST_FEEDBACK_REPORTS_SQL).toContain('topics');
    expect(LIST_FEEDBACK_REPORTS_SQL).not.toMatch(/\bseed\b/);
  });

  it('maps a row and strips seed from log_tail', async () => {
    const createdAt = new Date('2026-09-01T12:00:00.000Z');
    const query = vi.fn(() =>
      Promise.resolve({
        rows: [
          {
            id: 'row-1',
            created_at: createdAt,
            kind: 'bug',
            message: 'Draw felt like a card',
            contact: null,
            nickname: 'Ada',
            game_code: 'ABCDEF',
            screen: 'table',
            protocol_version: 30,
            play_kind: 'classic',
            log_tail: [{ kind: 'actionPlayed', seed: 'secret' }],
            user_agent: 'vitest',
            topics: ['ui', 'gameplay'],
          },
        ],
      }),
    );

    const rows = await listFeedbackReports({ query } as never);
    expect(rows).toEqual([
      {
        id: 'row-1',
        createdAt: '2026-09-01T12:00:00.000Z',
        kind: 'bug',
        message: 'Draw felt like a card',
        contact: null,
        nickname: 'Ada',
        gameCode: 'ABCDEF',
        screen: 'table',
        protocolVersion: 30,
        playKind: 'classic',
        logTail: [{ kind: 'actionPlayed' }],
        userAgent: 'vitest',
        topics: ['ui', 'gameplay'],
      },
    ]);
    expect(JSON.stringify(rows)).not.toContain('seed');
    expect(query).toHaveBeenCalledOnce();
  });

  it('drops a row whose kind is outside the CHECK union', () => {
    expect(
      mapFeedbackInboxRow({
        id: 'bad',
        created_at: '2026-09-01T12:00:00.000Z',
        kind: 'rating',
        message: 'nope',
        contact: null,
        nickname: null,
        game_code: null,
        screen: 'home',
        protocol_version: 30,
        play_kind: null,
        log_tail: null,
        user_agent: null,
      }),
    ).toBeNull();
  });

  it('treats a missing topics column as an empty list', () => {
    const mapped = mapFeedbackInboxRow({
      id: 'old',
      created_at: '2026-09-01T12:00:00.000Z',
      kind: 'bug',
      message: 'pre-chip row',
      contact: null,
      nickname: null,
      game_code: null,
      screen: 'home',
      protocol_version: 30,
      play_kind: null,
      log_tail: null,
      user_agent: null,
    });
    expect(mapped?.topics).toEqual([]);
  });
});
