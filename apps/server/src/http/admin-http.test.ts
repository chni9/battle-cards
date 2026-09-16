import { createServer } from 'node:http';

import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createIpRateLimiter } from './ip-rate-limit';
import { mountAdminApi, type AdminApiDeps } from './admin-http';

const closers: (() => void)[] = [];

afterEach(() => {
  for (const close of closers) close();
  closers.length = 0;
});

async function listen(app: express.Express): Promise<{ base: string; close: () => void }> {
  const server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });
  const addr = server.address();
  if (addr === null || typeof addr === 'string') {
    throw new Error('expected port');
  }
  return {
    base: `http://127.0.0.1:${String(addr.port)}`,
    close: () => {
      server.close();
    },
  };
}

function defaultQueryMock() {
  return vi.fn((sql: string) => {
    if (sql.includes('COUNT(*)')) {
      return Promise.resolve({
        rows: [
          {
            game_count: '0',
            human_only: '0',
            with_bots: '0',
            avg_duration: null,
            avg_turns: null,
          },
        ],
      });
    }
    if (sql.includes('feedback_reports')) {
      return Promise.resolve({ rows: [{ count: '0' }] });
    }
    return Promise.resolve({ rows: [] });
  });
}

function testDeps(overrides: Partial<AdminApiDeps> = {}): AdminApiDeps {
  const query = defaultQueryMock();
  return {
    getPool: () => ({ query }) as never,
    isProduction: () => false,
    inboxAuth: {
      readInboxPassword: () => 'admin-secret',
      inboxAuthLimiter: createIpRateLimiter(10, 60_000, () => Date.now()),
    },
    ...overrides,
  };
}

describe('GET /api/admin/overview (L61-03)', () => {
  async function start(deps: AdminApiDeps = testDeps()): Promise<string> {
    const app = express();
    mountAdminApi(app, deps);
    const server = await listen(app);
    closers.push(server.close);
    return server.base;
  }

  it('returns 404 when INBOX_PASSWORD is unset', async () => {
    const base = await start(
      testDeps({
        inboxAuth: {
          readInboxPassword: () => undefined,
          inboxAuthLimiter: createIpRateLimiter(10, 60_000, () => Date.now()),
        },
      }),
    );
    const response = await fetch(`${base}/api/admin/overview`);
    expect(response.status).toBe(404);
  });

  it('returns 401 on wrong password and 429 after limit', async () => {
    const base = await start(
      testDeps({
        inboxAuth: {
          readInboxPassword: () => 'admin-secret',
          inboxAuthLimiter: createIpRateLimiter(2, 60_000, () => Date.now()),
        },
      }),
    );
    const wrong = await fetch(`${base}/api/admin/overview`, {
      headers: { 'X-Inbox-Password': 'nope' },
    });
    expect(wrong.status).toBe(401);
    await fetch(`${base}/api/admin/overview`, { headers: { 'X-Inbox-Password': 'nope' } });
    const limited = await fetch(`${base}/api/admin/overview`, {
      headers: { 'X-Inbox-Password': 'nope' },
    });
    expect(limited.status).toBe(429);
    const ok = await fetch(`${base}/api/admin/overview`, {
      headers: { 'X-Inbox-Password': 'admin-secret' },
    });
    expect(ok.status).toBe(200);
  });

  it('returns 503 when DATABASE_URL is unset', async () => {
    const base = await start(testDeps({ getPool: () => null }));
    const response = await fetch(`${base}/api/admin/overview`, {
      headers: { 'X-Inbox-Password': 'admin-secret' },
    });
    expect(response.status).toBe(503);
  });

  it('defaults to excluding tutorial games in SQL', async () => {
    const query = vi.fn((sql: string) => {
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve({
          rows: [
            {
              game_count: '0',
              human_only: '0',
              with_bots: '0',
              avg_duration: null,
              avg_turns: null,
            },
          ],
        });
      }
      if (sql.includes('feedback_reports')) {
        return Promise.resolve({ rows: [{ count: '0' }] });
      }
      return Promise.resolve({ rows: [] });
    });
    const base = await start(testDeps({ getPool: () => ({ query }) as never }));
    const response = await fetch(`${base}/api/admin/overview`, {
      headers: { 'X-Inbox-Password': 'admin-secret' },
    });
    expect(response.status).toBe(200);
    expect(
      query.mock.calls.some((call) => {
        const sql = call[0];
        return typeof sql === 'string' && sql.includes('is_tutorial = false');
      }),
    ).toBe(true);
  });
});

describe('GET /api/admin/games (L61-03)', () => {
  it('returns paginated list when authorized', async () => {
    const query = vi.fn((sql: string) => {
      if (sql.includes('AS count FROM finished_games')) {
        return Promise.resolve({ rows: [{ count: '1' }] });
      }
      return Promise.resolve({
        rows: [
          {
            room_id: 'ABCDEF',
            ended_at: new Date('2026-01-01T00:00:00.000Z'),
            duration_ms: 1000,
            turn_sequence: 5,
            has_bots: false,
            is_tutorial: false,
            occupancy: '2',
            winner_nickname: 'Ada',
            winner_kit_id: 'kamikaze',
          },
        ],
      });
    });
    const app = express();
    mountAdminApi(app, testDeps({ getPool: () => ({ query }) as never }));
    const server = await listen(app);
    closers.push(server.close);
    const response = await fetch(`${server.base}/api/admin/games`, {
      headers: { 'X-Inbox-Password': 'admin-secret' },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: { roomId: string }[] };
    expect(body.items[0]?.roomId).toBe('ABCDEF');
  });
});
