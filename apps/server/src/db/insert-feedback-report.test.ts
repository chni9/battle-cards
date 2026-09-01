import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { insertFeedbackReport } from './insert-feedback-report';

const migrationSql = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../db/migrations/005_feedback_reports.sql'),
  'utf8',
);

describe('insertFeedbackReport (technical spec v6 §7.2 / L47-01)', () => {
  it('inserts a report with log_tail and without game_code', async () => {
    const logTail = [{ kind: 'actionPlayed', turnSequence: 1 }];
    const query = vi.fn((sql: string, params: unknown[]) => {
      expect(sql).toContain('INSERT INTO feedback_reports');
      expect(sql).toContain('log_tail');
      expect(sql).not.toMatch(/\bseed\b/);
      expect(params[4]).toBeNull();
      expect(params[8]).toBe(JSON.stringify(logTail));
      return Promise.resolve({ rows: [{ id: 'report-uuid' }] });
    });

    const id = await insertFeedbackReport({ query } as never, {
      kind: 'bug',
      message: 'Draw felt like a card',
      contact: null,
      nickname: 'Ada',
      gameCode: null,
      screen: 'home',
      protocolVersion: 30,
      playKind: null,
      logTail,
      userAgent: 'vitest',
    });

    expect(id).toBe('report-uuid');
    expect(query).toHaveBeenCalledOnce();
  });

  it('binds null log_tail when the insert has no tail', async () => {
    const query = vi.fn((_sql: string, params: unknown[]) => {
      expect(params[8]).toBeNull();
      return Promise.resolve({ rows: [{ id: 'empty-tail' }] });
    });

    await insertFeedbackReport({ query } as never, {
      kind: 'idea',
      message: 'Add a recap filter',
      contact: 'ada@example.com',
      nickname: null,
      gameCode: 'ABCDEF',
      screen: 'end',
      protocolVersion: 30,
      playKind: 'classic',
      logTail: null,
      userAgent: null,
    });

    expect(query).toHaveBeenCalledOnce();
  });

  it('throws when RETURNING id is missing', async () => {
    const query = vi.fn(() => Promise.resolve({ rows: [] }));

    await expect(
      insertFeedbackReport({ query } as never, {
        kind: 'confusion',
        message: 'What is Incoming?',
        contact: null,
        nickname: null,
        gameCode: null,
        screen: 'table',
        protocolVersion: 30,
        playKind: 'tutorial',
        logTail: null,
        userAgent: null,
      }),
    ).rejects.toThrow('feedback_reports insert returned no id');
  });
});

describe('005_feedback_reports.sql (technical spec v6 §7.2 / L47-01)', () => {
  it('checks kind and has no seed column', () => {
    expect(migrationSql).toContain(
      "CONSTRAINT feedback_reports_kind_check CHECK (kind IN ('bug', 'confusion', 'idea'))",
    );
    const createStart = migrationSql.indexOf('CREATE TABLE feedback_reports');
    expect(createStart).toBeGreaterThanOrEqual(0);
    const tableBody = migrationSql.slice(createStart);
    expect(tableBody).not.toMatch(/\bseed\b/);
    expect(tableBody).toContain('log_tail jsonb');
    expect(tableBody).toContain('game_code text');
  });
});
