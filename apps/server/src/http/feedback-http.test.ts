import { createServer } from 'node:http';

import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FeedbackReportInsert } from '../db/feedback-types';
import { createIpRateLimiter } from './ip-rate-limit';
import {
  FEEDBACK_COULD_NOT_SAVE,
  FEEDBACK_NOT_SAVED_NO_DB,
  mountFeedbackApi,
  type FeedbackApiDeps,
} from './feedback-http';

const inserted: FeedbackReportInsert[] = [];

function mockPool(): { query: ReturnType<typeof vi.fn> } {
  return { query: vi.fn() };
}

function testDeps(overrides: Partial<FeedbackApiDeps> = {}): FeedbackApiDeps {
  return {
    getPool: () => mockPool() as never,
    insertReport: (_pool, report) => {
      inserted.push(report);
      return Promise.resolve('id-1');
    },
    lookupLive: () => null,
    lookupFinished: () => Promise.resolve(null),
    isProduction: () => false,
    rateLimiter: createIpRateLimiter(10, 60_000, () => Date.now()),
    listReports: () => Promise.resolve([]),
    readInboxPassword: () => 'inbox-secret',
    ...overrides,
  };
}

async function listen(app: express.Express): Promise<{
  base: string;
  close: () => void;
}> {
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

describe('POST /api/feedback (technical spec v6 §7.1 / L47-02)', () => {
  const closers: (() => void)[] = [];

  afterEach(() => {
    inserted.length = 0;
    for (const close of closers) close();
    closers.length = 0;
  });

  async function start(deps: FeedbackApiDeps = testDeps()): Promise<string> {
    const app = express();
    app.use('/api', express.json());
    mountFeedbackApi(app, deps);
    const server = await listen(app);
    closers.push(server.close);
    return server.base;
  }

  it('persists a home report without game_code and strips seed from logTail', async () => {
    const base = await start();
    const response = await fetch(`${base}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'vitest' },
      body: JSON.stringify({
        kind: 'bug',
        message: 'Home is confusing',
        screen: 'home',
        protocolVersion: 30,
        logTail: [{ kind: 'actionPlayed', seed: 'secret' }],
      }),
    });

    expect(response.status).toBe(200);
    expect(inserted).toHaveLength(1);
    const row = inserted[0];
    expect(row?.gameCode).toBeNull();
    expect(row?.userAgent).toBe('vitest');
    expect(JSON.stringify(row)).not.toContain('seed');
    expect(row?.logTail).toEqual([{ kind: 'actionPlayed' }]);
  });

  it('returns 503 with the local copy when DATABASE_URL is unset', async () => {
    const base = await start(
      testDeps({
        getPool: () => null,
        isProduction: () => false,
      }),
    );
    const response = await fetch(`${base}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'idea',
        message: 'A note',
        screen: 'home',
      }),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      message: FEEDBACK_NOT_SAVED_NO_DB,
    });
    expect(inserted).toHaveLength(0);
  });

  it('returns 503 with the production copy when DATABASE_URL is unset in production', async () => {
    const base = await start(
      testDeps({
        getPool: () => null,
        isProduction: () => true,
      }),
    );
    const response = await fetch(`${base}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'confusion',
        message: 'What is Draw?',
        screen: 'home',
      }),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      message: FEEDBACK_COULD_NOT_SAVE,
    });
  });

  it('returns 503 with the production copy when insert throws', async () => {
    const base = await start(
      testDeps({
        insertReport: () => Promise.reject(new Error('disk full')),
      }),
    );
    const response = await fetch(`${base}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'bug',
        message: 'Crash',
        screen: 'table',
      }),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      message: FEEDBACK_COULD_NOT_SAVE,
    });
  });

  it('rate-limits the 11th POST from one IP', async () => {
    let now = 1_000;
    const base = await start(
      testDeps({
        rateLimiter: createIpRateLimiter(10, 60_000, () => now),
      }),
    );
    const body = JSON.stringify({
      kind: 'bug',
      message: 'spam',
      screen: 'home',
    });
    for (let i = 0; i < 10; i += 1) {
      const ok = await fetch(`${base}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      expect(ok.status).toBe(200);
    }
    const limited = await fetch(`${base}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    expect(limited.status).toBe(429);
    now += 60_001;
    const after = await fetch(`${base}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    expect(after.status).toBe(200);
  });

  it('overwrites room-level fields from a live room and keeps client nickname', async () => {
    const base = await start(
      testDeps({
        lookupLive: (code) =>
          code === 'ABCDEF'
            ? {
                gameCode: 'ABCDEF',
                playKind: 'tutorial',
                protocolVersion: 30,
                logTail: [
                  {
                    kind: 'rewardsClaimed',
                    eliminatorPlayerId: 'a',
                    eliminatedPlayerId: 'b',
                    turnSequence: 4,
                  },
                ],
              }
            : null,
      }),
    );
    const response = await fetch(`${base}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'bug',
        message: 'Coach blocked Draw',
        screen: 'tutorial',
        nickname: 'Ada',
        gameCode: 'abcdef',
        playKind: 'classic',
        protocolVersion: 1,
        logTail: [],
      }),
    });

    expect(response.status).toBe(200);
    expect(inserted[0]?.nickname).toBe('Ada');
    expect(inserted[0]?.screen).toBe('tutorial');
    expect(inserted[0]?.playKind).toBe('tutorial');
    expect(inserted[0]?.gameCode).toBe('ABCDEF');
    expect(inserted[0]?.protocolVersion).toBe(30);
    expect(inserted[0]?.logTail).toEqual([
      {
        kind: 'rewardsClaimed',
        eliminatorPlayerId: 'a',
        eliminatedPlayerId: 'b',
        turnSequence: 4,
      },
    ]);
  });

  it('falls back to finished_games public columns when no live room', async () => {
    const lookupFinished = vi.fn(() =>
      Promise.resolve({
        gameCode: 'ABCDEF',
        playKind: 'classic' as const,
        logTail: [
          {
            kind: 'playerEliminated',
            playerId: 'a',
            eliminatorPlayerId: null,
            reason: 'combat',
            turnSequence: 9,
          },
        ],
      }),
    );
    const base = await start(testDeps({ lookupFinished }));
    const response = await fetch(`${base}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'idea',
        message: 'Recap',
        screen: 'end',
        gameCode: 'ABCDEF',
      }),
    });

    expect(response.status).toBe(200);
    expect(lookupFinished).toHaveBeenCalled();
    expect(inserted[0]?.playKind).toBe('classic');
    expect(JSON.stringify(inserted[0])).not.toContain('seed');
  });

  it('sets CORS for the Vite origin in development', async () => {
    const base = await start(testDeps({ isProduction: () => false }));
    const response = await fetch(`${base}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
      },
      body: JSON.stringify({
        kind: 'bug',
        message: 'cors',
        screen: 'home',
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:5173',
    );
  });

  it('rejects an invalid kind', async () => {
    const base = await start();
    const response = await fetch(`${base}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'rating',
        message: '5',
        screen: 'home',
      }),
    });
    expect(response.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });
});

describe('GET /api/inbox (technical spec v6 §7.3 / L47-04)', () => {
  const closers: (() => void)[] = [];

  afterEach(() => {
    inserted.length = 0;
    for (const close of closers) close();
    closers.length = 0;
  });

  async function start(deps: FeedbackApiDeps = testDeps()): Promise<string> {
    const app = express();
    app.use('/api', express.json());
    mountFeedbackApi(app, deps);
    const server = await listen(app);
    closers.push(server.close);
    return server.base;
  }

  it('returns 404 when INBOX_PASSWORD is unset', async () => {
    const base = await start(
      testDeps({
        readInboxPassword: () => undefined,
      }),
    );
    const response = await fetch(`${base}/api/inbox`, {
      headers: { 'X-Inbox-Password': 'inbox-secret' },
    });
    expect(response.status).toBe(404);
  });

  it('returns 401 when the password header is missing or wrong', async () => {
    const base = await start();
    const missing = await fetch(`${base}/api/inbox`);
    expect(missing.status).toBe(401);

    const wrong = await fetch(`${base}/api/inbox`, {
      headers: { 'X-Inbox-Password': 'nope' },
    });
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual({ ok: false });
  });

  it('returns all rows newest first when the password matches', async () => {
    const rows = [
      {
        id: 'newer',
        createdAt: '2026-09-01T13:00:00.000Z',
        kind: 'idea' as const,
        message: 'Later',
        contact: null,
        nickname: 'Ada',
        gameCode: 'ABCDEF',
        screen: 'end' as const,
        protocolVersion: 30,
        playKind: 'classic' as const,
        logTail: [{ kind: 'actionPlayed' }],
        userAgent: 'vitest',
      },
      {
        id: 'older',
        createdAt: '2026-09-01T12:00:00.000Z',
        kind: 'bug' as const,
        message: 'Earlier',
        contact: 'ada@example.com',
        nickname: null,
        gameCode: null,
        screen: 'home' as const,
        protocolVersion: 30,
        playKind: null,
        logTail: null,
        userAgent: null,
      },
    ];
    const listReports = vi.fn(() => Promise.resolve(rows));
    const base = await start(testDeps({ listReports }));
    const response = await fetch(`${base}/api/inbox`, {
      headers: { 'X-Inbox-Password': 'inbox-secret' },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(rows);
    expect(listReports).toHaveBeenCalledOnce();
    expect(JSON.stringify(rows)).not.toContain('seed');
  });

  it('returns 503 when the password matches but DATABASE_URL is unset', async () => {
    const base = await start(
      testDeps({
        getPool: () => null,
      }),
    );
    const response = await fetch(`${base}/api/inbox`, {
      headers: { 'X-Inbox-Password': 'inbox-secret' },
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false });
  });
});
