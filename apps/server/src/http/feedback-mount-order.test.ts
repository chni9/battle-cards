import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';

import { mountStaticSpa } from './static-spa';
import { createIpRateLimiter } from './ip-rate-limit';
import { mountFeedbackApi, type FeedbackApiDeps } from './feedback-http';

describe('feedback mount order (technical spec v6 §4 / L47-02)', () => {
  const servers: ReturnType<typeof createServer>[] = [];

  afterEach(() => {
    for (const s of servers) s.close();
    servers.length = 0;
  });

  it('keeps POST /api/feedback before the SPA catch-all', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-feedback-spa-'));
    await writeFile(path.join(dir, 'index.html'), '<html>spa</html>', 'utf8');

    const inserted: unknown[] = [];
    const deps: FeedbackApiDeps = {
      getPool: () => ({ query: () => undefined }) as never,
      insertReport: (_pool, report) => {
        inserted.push(report);
        return Promise.resolve('id');
      },
      listReports: () => Promise.resolve([]),
      lookupLive: () => null,
      lookupFinished: () => Promise.resolve(null),
      isProduction: () => false,
      rateLimiter: createIpRateLimiter(),
      inboxAuthLimiter: createIpRateLimiter(),
      readInboxPassword: () => 'inbox-secret',
    };

    const app = express();
    app.use('/api', express.json());
    mountFeedbackApi(app, deps);
    mountStaticSpa(app, dir);

    const server = createServer(app);
    servers.push(server);
    await new Promise<void>((resolve) => {
      server.listen(0, resolve);
    });
    const addr = server.address();
    if (addr === null || typeof addr === 'string') {
      throw new Error('expected port');
    }
    const base = `http://127.0.0.1:${String(addr.port)}`;

    const spa = await fetch(`${base}/inbox`);
    expect(await spa.text()).toBe('<html>spa</html>');

    const post = await fetch(`${base}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'bug',
        message: 'not the spa',
        screen: 'home',
        topics: ['ui'],
      }),
    });
    expect(post.status).toBe(200);
    expect(inserted).toHaveLength(1);
  });

  it('registers live rooms from GameRoom create/dispose', () => {
    const source = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), '../rooms/game-room.ts'),
      'utf8',
    );
    expect(source).toContain('registerLiveFeedbackRoom');
    expect(source).toContain('unregisterLiveFeedbackRoom');
    expect(source).toContain('liveFeedbackContextFrom');
  });

  it('mounts /api in index.ts even when STATIC_DIR is missing', () => {
    const source = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), '../index.ts'),
      'utf8',
    );
    const apiIndex = source.indexOf('mountFeedbackApi');
    const staticIndex = source.indexOf('mountStaticSpa');
    expect(apiIndex).toBeGreaterThan(0);
    expect(staticIndex).toBeGreaterThan(apiIndex);
    expect(source).toContain("app.use('/api', express.json");
    expect(source).toContain("app.set('trust proxy', 1)");
    expect(source).toContain('allowInboxPasswordCorsHeader');
  });

  it('registers GET /api/inbox on the feedback HTTP module', () => {
    const source = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), 'feedback-http.ts'),
      'utf8',
    );
    expect(source).toContain("app.get('/api/inbox'");
    expect(source).toContain("app.options('/api/inbox'");
  });
});
