import { createServer } from 'node:http';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';

import { mountStaticSpa, resolveStaticDir } from './static-spa';

describe('resolveStaticDir', () => {
  it('returns undefined when STATIC_DIR points at a missing path', () => {
    const prev = process.env['STATIC_DIR'];
    process.env['STATIC_DIR'] = path.join(tmpdir(), 'card-battle-missing-static');
    try {
      expect(resolveStaticDir()).toBeUndefined();
    } finally {
      if (prev === undefined) delete process.env['STATIC_DIR'];
      else process.env['STATIC_DIR'] = prev;
    }
  });
});

describe('mountStaticSpa', () => {
  const servers: ReturnType<typeof createServer>[] = [];

  afterEach(() => {
    for (const s of servers) s.close();
    servers.length = 0;
  });

  it('serves index.html for unknown GET paths (SPA fallback)', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-spa-'));
    await writeFile(path.join(dir, 'index.html'), '<html>ok</html>', 'utf8');
    await mkdir(path.join(dir, 'assets'));
    await writeFile(path.join(dir, 'assets', 'app.js'), 'console.log(1)', 'utf8');

    const app = express();
    mountStaticSpa(app, dir);
    const server = createServer(app);
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('expected port');
    const base = `http://127.0.0.1:${String(addr.port)}`;

    const asset = await fetch(`${base}/assets/app.js`);
    expect(asset.status).toBe(200);
    expect(await asset.text()).toContain('console.log');

    const spa = await fetch(`${base}/lobby/abc`);
    expect(spa.status).toBe(200);
    expect(await spa.text()).toBe('<html>ok</html>');
  });

  it('returns 404 for missing /assets/* instead of SPA index.html', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-spa-assets-'));
    await writeFile(path.join(dir, 'index.html'), '<html>ok</html>', 'utf8');
    await mkdir(path.join(dir, 'assets'));

    const app = express();
    mountStaticSpa(app, dir);
    const server = createServer(app);
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('expected port');
    const base = `http://127.0.0.1:${String(addr.port)}`;

    const missing = await fetch(`${base}/assets/Thief_-.png`);
    expect(missing.status).toBe(404);
    expect(await missing.text()).not.toContain('<html>');
  });
});
