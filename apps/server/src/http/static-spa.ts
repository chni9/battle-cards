/**
 * Serve the Vite SPA from the same Colyseus HTTP server (Coolify single-container).
 * Soft-skips when the directory is missing so local `tsx` without a client build still boots.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

import type { Application } from 'express';
import express from 'express';

const DEFAULT_RELATIVE_STATIC_DIR = 'apps/client/dist';

/** Absolute static root, or undefined if unset/missing (caller should skip mount). */
export function resolveStaticDir(
  envValue: string | undefined = process.env['STATIC_DIR'],
  cwd: string = process.cwd(),
): string | undefined {
  const candidate =
    envValue !== undefined && envValue.length > 0
      ? path.resolve(envValue)
      : path.resolve(cwd, DEFAULT_RELATIVE_STATIC_DIR);

  if (!existsSync(candidate)) {
    return undefined;
  }

  return candidate;
}

export function mountStaticSpa(app: Application, staticDir: string): void {
  app.use(express.static(staticDir));

  app.get(/.*/, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    // Let Colyseus / API handlers win when they already handled the request.
    res.sendFile(path.join(staticDir, 'index.html'), (err: Error | undefined) => {
      if (err !== undefined) next(err);
    });
  });
}
