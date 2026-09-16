/**
 * Shared inbox/admin password gate (technical spec v6 §7.3 / Lot 61).
 */

import type { Request, Response } from 'express';

import {
  createIpRateLimiter,
  INBOX_AUTH_RATE_LIMIT_MAX,
  INBOX_AUTH_RATE_LIMIT_WINDOW_MS,
  type IpRateLimiter,
} from './ip-rate-limit';
import { timingSafeEqualUtf8 } from './timing-safe-equal';

export function readInboxPasswordFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const value = env['INBOX_PASSWORD'];
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  return value;
}

const DEV_CORS_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);

export function applyInboxDevCors(req: Request, res: Response, isProduction: boolean): void {
  if (isProduction) {
    return;
  }
  const origin = req.get('origin');
  if (origin !== undefined && DEV_CORS_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Inbox-Password');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
}

export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export interface InboxAuthDeps {
  readInboxPassword: () => string | undefined;
  inboxAuthLimiter: IpRateLimiter;
}

export type InboxAuthFailure =
  | { kind: 'no_password' }
  | { kind: 'unauthorized'; rateLimited: boolean };

export function checkInboxPassword(
  req: Request,
  deps: InboxAuthDeps,
): { ok: true } | InboxAuthFailure {
  const expected = deps.readInboxPassword();
  if (expected === undefined) {
    return { kind: 'no_password' };
  }

  const provided = req.get('x-inbox-password');
  const matches = provided !== undefined && timingSafeEqualUtf8(provided, expected);
  if (!matches) {
    const rateLimited = !deps.inboxAuthLimiter.take(clientIp(req));
    return { kind: 'unauthorized', rateLimited };
  }

  return { ok: true };
}

export function respondInboxAuthFailure(res: Response, failure: InboxAuthFailure): void {
  if (failure.kind === 'no_password') {
    res.status(404).end();
    return;
  }
  if (failure.rateLimited) {
    res.status(429).json({ ok: false });
    return;
  }
  res.status(401).json({ ok: false });
}

export function defaultInboxAuthDeps(): InboxAuthDeps {
  return {
    readInboxPassword: () => readInboxPasswordFromEnv(),
    inboxAuthLimiter: createIpRateLimiter(
      INBOX_AUTH_RATE_LIMIT_MAX,
      INBOX_AUTH_RATE_LIMIT_WINDOW_MS,
    ),
  };
}
