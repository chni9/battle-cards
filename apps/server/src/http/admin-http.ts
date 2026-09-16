/**
 * Designer admin HTTP API (Lot 61) — technical spec v6 §14.
 */

import type { Application, Request, Response } from 'express';
import type { Pool } from 'pg';

import { getPool } from '../db/pool';
import { loadAdminGameDetail } from '../db/admin-game-detail';
import { loadAdminGamesPage } from '../db/admin-list-games';
import { loadAdminKitStats } from '../db/admin-kit-stats';
import { loadAdminOverview } from '../db/admin-overview';
import { loadAdminTablePage } from '../db/admin-table-browser';
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

function paramString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
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
  corsOptions('/api/admin/games/:roomId');
  corsOptions('/api/admin/kit-stats');
  corsOptions('/api/admin/tables/:name');

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

  app.get('/api/admin/games/:roomId', (req, res) => {
    void handleGameDetail(req, res, deps).catch(() => {
      if (!res.headersSent) {
        res.status(503).json({ ok: false });
      }
    });
  });

  app.get('/api/admin/kit-stats', (req, res) => {
    void handleKitStats(req, res, deps).catch(() => {
      if (!res.headersSent) {
        res.status(503).json({ ok: false });
      }
    });
  });

  app.get('/api/admin/tables/:name', (req, res) => {
    void handleTableBrowser(req, res, deps).catch(() => {
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

async function handleGameDetail(req: Request, res: Response, deps: AdminApiDeps): Promise<void> {
  const pool = requireAdminPool(req, res, deps);
  if (pool === null) {
    return;
  }
  const roomId = paramString(req.params['roomId']);
  if (roomId === undefined || roomId.length === 0) {
    res.status(400).json({ ok: false });
    return;
  }
  const detail = await loadAdminGameDetail(pool, roomId);
  if (detail === null) {
    res.status(404).json({ ok: false });
    return;
  }
  res.status(200).json(detail);
}

async function handleKitStats(req: Request, res: Response, deps: AdminApiDeps): Promise<void> {
  const pool = requireAdminPool(req, res, deps);
  if (pool === null) {
    return;
  }
  const filters = parseAdminFinishedGameFilters(recordQuery(req.query));
  const stats = await loadAdminKitStats(pool, filters);
  res.status(200).json(stats);
}

async function handleTableBrowser(req: Request, res: Response, deps: AdminApiDeps): Promise<void> {
  const pool = requireAdminPool(req, res, deps);
  if (pool === null) {
    return;
  }
  const name = paramString(req.params['name']);
  if (name === undefined || name.length === 0) {
    res.status(400).json({ ok: false });
    return;
  }
  const query = recordQuery(req.query);
  const { page, pageSize, offset } = parseAdminPagination(
    typeof query['page'] === 'string' ? query['page'] : undefined,
    typeof query['pageSize'] === 'string' ? query['pageSize'] : undefined,
  );
  const result = await loadAdminTablePage(pool, name, page, pageSize, offset);
  if (result === null) {
    res.status(404).json({ ok: false });
    return;
  }
  res.status(200).json(result);
}
