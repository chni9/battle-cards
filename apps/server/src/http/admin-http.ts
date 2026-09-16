/**
 * Designer admin HTTP API (Lot 61) — technical spec v6 §14.
 */

import type { Application, Request, Response } from 'express';
import type { Pool } from 'pg';

import { getPool } from '../db/pool';
import { loadAdminGamesPage } from '../db/admin-list-games';
import { loadAdminOverview } from '../db/admin-overview';
import {
  parseAdminFinishedGameFilters,
  parseAdminPagination,
} from '../db/admin-filters';
import {
  applyInboxDevCors,
  checkInboxPassword,
  defaultInboxAuthDeps,
  respondInboxAuthFailure,
  type InboxAuthDeps,
} from './inbox-auth';

export interface AdminApiDeps {
  getPool: () => Pool | null;
  isProduction: () => boolean;
  inboxAuth: InboxAuthDeps;
}

export function defaultAdminApiDeps(): AdminApiDeps {
  return {
    getPool,
    isProduction: () => process.env['NODE_ENV'] === 'production',
    inboxAuth: defaultInboxAuthDeps(),
  };
}

function requireAdminPool(
  req: Request,
  res: Response,
  deps: AdminApiDeps,
): Pool | null {
  applyInboxDevCors(req, res, deps.isProduction());
  const auth = checkInboxPassword(req, deps.inboxAuth);
  if (!('ok' in auth)) {
    respondInboxAuthFailure(res, auth);
    return null;
  }
  const pool = deps.getPool();
  if (pool === null) {
    res.status(503).json({ ok: false });
    return null;
  }
  return pool;
}

function recordQuery(query: Request['query']): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query)) {
    out[key] = value;
  }
  return out;
}

export function mountAdminApi(app: Application, deps: AdminApiDeps): void {
  const corsOptions = (path: string): void => {
    app.options(path, (req, res) => {
      applyInboxDevCors(req, res, deps.isProduction());
      res.status(204).end();
    });
  };

  corsOptions('/api/admin/overview');
  corsOptions('/api/admin/games');

  app.get('/api/admin/overview', (req, res) => {
    void handleOverview(req, res, deps).catch(() => {
      if (!res.headersSent) {
        res.status(503).json({ ok: false });
      }
    });
  });

  app.get('/api/admin/games', (req, res) => {
    void handleGames(req, res, deps).catch(() => {
      if (!res.headersSent) {
        res.status(503).json({ ok: false });
      }
    });
  });
}

async function handleOverview(req: Request, res: Response, deps: AdminApiDeps): Promise<void> {
  const pool = requireAdminPool(req, res, deps);
  if (pool === null) {
    return;
  }
  const filters = parseAdminFinishedGameFilters(recordQuery(req.query));
  const overview = await loadAdminOverview(pool, filters);
  res.status(200).json(overview);
}

async function handleGames(req: Request, res: Response, deps: AdminApiDeps): Promise<void> {
  const pool = requireAdminPool(req, res, deps);
  if (pool === null) {
    return;
  }
  const query = recordQuery(req.query);
  const filters = parseAdminFinishedGameFilters(query);
  const { page, pageSize, offset } = parseAdminPagination(
    typeof query['page'] === 'string' ? query['page'] : undefined,
    typeof query['pageSize'] === 'string' ? query['pageSize'] : undefined,
  );
  const result = await loadAdminGamesPage(pool, filters, page, pageSize, offset);
  res.status(200).json(result);
}
