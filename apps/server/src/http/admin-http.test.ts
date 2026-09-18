import { createServer } from 'node:http';

import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createIpRateLimiter } from './ip-rate-limit';
import { mountAdminApi, type AdminApiDeps } from './admin-http';
import { mountFeedbackApi, type FeedbackApiDeps } from './feedback-http';

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
    if (sql.includes('overview_median_duration')) {
      return Promise.resolve({
        rows: [
          {
            overview_game_count: '0',
            overview_human_only: '0',
            overview_with_bots: '0',
            overview_avg_duration: null,
            overview_median_duration: null,
            overview_avg_turns: null,
            overview_avg_clock: null,
            overview_avg_occupancy: null,
          },
        ],
      });
    }
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
      if (sql.includes('overview_median_duration') || sql.includes('COUNT(*)')) {
        return Promise.resolve({
          rows: [
            {
              overview_game_count: '0',
              overview_human_only: '0',
              overview_with_bots: '0',
              game_count: '0',
              human_only: '0',
              with_bots: '0',
              avg_duration: null,
              avg_turns: null,
              overview_avg_duration: null,
              overview_median_duration: null,
              overview_avg_turns: null,
              overview_avg_clock: null,
              overview_avg_occupancy: null,
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
    const body: unknown = await response.json();
    expect(typeof body).toBe('object');
    expect(body).not.toBeNull();
    if (typeof body === 'object' && body !== null) {
      expect('general' in body).toBe(true);
      expect('volume' in body).toBe(true);
      expect('endings' in body).toBe(true);
      expect('retention' in body).toBe(true);
      expect('feedbackPulse' in body).toBe(true);
      expect('gameplay' in body).toBe(true);
      expect('economy' in body).toBe(true);
      expect('combat' in body).toBe(true);
      expect('hidden' in body).toBe(true);
      expect('botsSeats' in body).toBe(true);
    }
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
            id: '11111111-1111-4111-8111-111111111111',
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
    const body = (await response.json()) as { items: { id: string; roomId: string }[] };
    expect(body.items[0]?.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(body.items[0]?.roomId).toBe('ABCDEF');
  });
});

describe('GET /api/admin/games/:gameId (L61-04)', () => {
  const gameId = '11111111-1111-4111-8111-111111111111';

  it('returns game detail including seed', async () => {
    const query = vi.fn((sql: string) => {
      if (sql.includes('FROM finished_games') && sql.includes('seed')) {
        return Promise.resolve({
          rows: [
            {
              id: gameId,
              room_id: 'ABCDEF',
              mode: 'classic',
              seed: 'secret-seed',
              winner_player_id: 'p1',
              turn_sequence: 3,
              started_at: new Date('2026-01-01T00:00:00.000Z'),
              ended_at: new Date('2026-01-01T00:10:00.000Z'),
              duration_ms: 600_000,
              has_bots: false,
              is_tutorial: false,
              export_log: null,
            },
          ],
        });
      }
      if (sql.includes('finished_game_players')) {
        return Promise.resolve({
          rows: [
            {
              player_id: 'p1',
              seat_index: 0,
              nickname: 'Ada',
              kit_id: 'kamikaze',
              lives: 5,
              points: 1,
              is_winner: true,
              is_eliminated: false,
              is_bot: false,
            },
          ],
        });
      }
      if (sql.includes('finished_game_eliminations')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });
    const app = express();
    mountAdminApi(app, testDeps({ getPool: () => ({ query }) as never }));
    const server = await listen(app);
    closers.push(server.close);
    const response = await fetch(`${server.base}/api/admin/games/${gameId}`, {
      headers: { 'X-Inbox-Password': 'admin-secret' },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      id: string;
      seed: string;
      seats: { nickname: string }[];
    };
    expect(body.id).toBe(gameId);
    expect(body.seed).toBe('secret-seed');
    expect(body.seats[0]?.nickname).toBe('Ada');
    expect(
      query.mock.calls.some((call) => {
        const sql = call[0];
        return typeof sql === 'string' && sql.includes('WHERE id = $1');
      }),
    ).toBe(true);
  });

  it('returns 404 for a room code so rematch rows are not collapsed', async () => {
    const query = vi.fn(() => Promise.resolve({ rows: [] }));
    const app = express();
    mountAdminApi(app, testDeps({ getPool: () => ({ query }) as never }));
    const server = await listen(app);
    closers.push(server.close);
    const response = await fetch(`${server.base}/api/admin/games/ABCDEF`, {
      headers: { 'X-Inbox-Password': 'admin-secret' },
    });
    expect(response.status).toBe(404);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/tables/:name (L61-05)', () => {
  it('returns 404 for unknown tables', async () => {
    const app = express();
    mountAdminApi(app, testDeps());
    const server = await listen(app);
    closers.push(server.close);
    const response = await fetch(`${server.base}/api/admin/tables/pg_catalog`, {
      headers: { 'X-Inbox-Password': 'admin-secret' },
    });
    expect(response.status).toBe(404);
  });
});

describe('shared inboxAuthLimiter (Lot 61)', () => {
  it('counts failed guesses across /api/inbox and /api/admin', async () => {
    const limiter = createIpRateLimiter(2, 60_000, () => Date.now());
    const inboxAuth = {
      readInboxPassword: () => 'admin-secret',
      inboxAuthLimiter: limiter,
    };
    const feedbackDeps: FeedbackApiDeps = {
      getPool: () => ({ query: vi.fn() }) as never,
      insertReport: () => Promise.resolve('id'),
      listReports: () => Promise.resolve([]),
      lookupLive: () => null,
      lookupFinished: () => Promise.resolve(null),
      isProduction: () => false,
      rateLimiter: createIpRateLimiter(10, 60_000, () => Date.now()),
      inboxAuthLimiter: limiter,
      readInboxPassword: () => 'admin-secret',
    };
    const app = express();
    mountFeedbackApi(app, feedbackDeps);
    mountAdminApi(app, testDeps({ inboxAuth }));
    const server = await listen(app);
    closers.push(server.close);
    const headers = { 'X-Inbox-Password': 'nope' };
    const inbox = await fetch(`${server.base}/api/inbox`, { headers });
    expect(inbox.status).toBe(401);
    const admin = await fetch(`${server.base}/api/admin/overview`, { headers });
    expect(admin.status).toBe(401);
    const limited = await fetch(`${server.base}/api/inbox`, { headers });
    expect(limited.status).toBe(429);
  });
});
