/**
 * HTTP feedback API — technical spec v6 §7.1 / L47-02.
 * Mount before the SPA catch-all. Never writes seed. Never 200 when DATABASE_URL is unset.
 */

import type { Application, Request, Response } from 'express';
import type { Pool } from 'pg';
import {
  FEEDBACK_LOG_TAIL_MAX,
  PROTOCOL_VERSION,
  isFeedbackKind,
  isFeedbackScreen,
  type FeedbackKind,
  type FeedbackScreen,
  type PlayKind,
} from '@card-battle/shared';

import type { FeedbackReportInsert } from '../db/feedback-types';
import { insertFeedbackReport } from '../db/insert-feedback-report';
import {
  lookupFinishedFeedbackContext,
  type FinishedFeedbackContext,
} from '../db/load-finished-feedback-context';
import { getPool } from '../db/pool';
import { normaliseGameCode } from '../rooms/game-code';
import {
  createIpRateLimiter,
  FEEDBACK_RATE_LIMIT_MAX,
  FEEDBACK_RATE_LIMIT_WINDOW_MS,
  type IpRateLimiter,
} from './ip-rate-limit';
import {
  lookupLiveFeedbackContext,
  type LiveFeedbackContext,
} from './live-feedback-registry';
import { stripSeed } from './strip-seed';

export const FEEDBACK_NOT_SAVED_NO_DB = 'Not saved (no database)';
export const FEEDBACK_COULD_NOT_SAVE = 'Could not save — try again';

const DEV_CORS_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);
const NICKNAME_MAX = 200;
const CONTACT_MAX = 200;
const MESSAGE_MAX = 4000;
const GAME_CODE_MAX = 32;

export interface FeedbackApiDeps {
  getPool: () => Pool | null;
  insertReport: (pool: Pool, report: FeedbackReportInsert) => Promise<string>;
  lookupLive: (gameCode: string) => LiveFeedbackContext | null;
  lookupFinished: (
    pool: Pool,
    gameCode: string,
  ) => Promise<FinishedFeedbackContext | null>;
  isProduction: () => boolean;
  rateLimiter: IpRateLimiter;
}

export function defaultFeedbackApiDeps(): FeedbackApiDeps {
  return {
    getPool,
    insertReport: insertFeedbackReport,
    lookupLive: lookupLiveFeedbackContext,
    lookupFinished: lookupFinishedFeedbackContext,
    isProduction: () => process.env['NODE_ENV'] === 'production',
    rateLimiter: createIpRateLimiter(
      FEEDBACK_RATE_LIMIT_MAX,
      FEEDBACK_RATE_LIMIT_WINDOW_MS,
    ),
  };
}

function applyDevCors(req: Request, res: Response, isProduction: boolean): void {
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

function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

function isPlayKind(value: unknown): value is PlayKind {
  return value === 'classic' || value === 'tutorial';
}

function optionalTrimmed(
  value: unknown,
  max: number,
): { ok: true; value: string | null } | { ok: false } {
  if (value === undefined) {
    return { ok: true, value: null };
  }
  if (typeof value !== 'string') {
    return { ok: false };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: true, value: null };
  }
  if (trimmed.length > max) {
    return { ok: false };
  }
  return { ok: true, value: trimmed };
}

function parseLogTail(value: unknown): { ok: true; value: unknown } | { ok: false } {
  if (value === undefined) {
    return { ok: true, value: null };
  }
  if (!Array.isArray(value)) {
    return { ok: false };
  }
  const stripped = stripSeed(value);
  if (!Array.isArray(stripped)) {
    return { ok: false };
  }
  return { ok: true, value: stripped.slice(-FEEDBACK_LOG_TAIL_MAX) };
}

interface ParsedFeedbackBody {
  kind: FeedbackKind;
  message: string;
  contact: string | null;
  nickname: string | null;
  gameCode: string | null;
  lookupCode: string | null;
  screen: FeedbackScreen;
  protocolVersion: number;
  playKind: PlayKind | null;
  logTail: unknown;
}

function parseFeedbackBody(body: unknown): ParsedFeedbackBody | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (!isFeedbackKind(record['kind']) || !isFeedbackScreen(record['screen'])) {
    return null;
  }
  const rawMessage = record['message'];
  if (typeof rawMessage !== 'string') {
    return null;
  }
  const message = rawMessage.trim();
  if (message.length < 1 || message.length > MESSAGE_MAX) {
    return null;
  }
  const contact = optionalTrimmed(record['contact'], CONTACT_MAX);
  const nickname = optionalTrimmed(record['nickname'], NICKNAME_MAX);
  const rawCode = optionalTrimmed(record['gameCode'], GAME_CODE_MAX);
  if (!contact.ok || !nickname.ok || !rawCode.ok) {
    return null;
  }
  const protocolRaw = record['protocolVersion'];
  let protocolVersion = PROTOCOL_VERSION;
  if (protocolRaw !== undefined) {
    if (typeof protocolRaw !== 'number' || !Number.isInteger(protocolRaw)) {
      return null;
    }
    protocolVersion = protocolRaw;
  }
  const playKindRaw = record['playKind'];
  let playKind: PlayKind | null = null;
  if (playKindRaw !== undefined) {
    if (!isPlayKind(playKindRaw)) {
      return null;
    }
    playKind = playKindRaw;
  }
  const logTail = parseLogTail(record['logTail']);
  if (!logTail.ok) {
    return null;
  }
  const lookupCode = rawCode.value === null ? null : normaliseGameCode(rawCode.value);

  return {
    kind: record['kind'],
    message,
    contact: contact.value,
    nickname: nickname.value,
    gameCode: lookupCode ?? rawCode.value,
    lookupCode,
    screen: record['screen'],
    protocolVersion,
    playKind,
    logTail: logTail.value,
  };
}

async function enrichReport(
  parsed: ParsedFeedbackBody,
  deps: FeedbackApiDeps,
  pool: Pool | null,
): Promise<ParsedFeedbackBody> {
  if (parsed.lookupCode === null) {
    return parsed;
  }

  const live = deps.lookupLive(parsed.lookupCode);
  if (live !== null) {
    return {
      ...parsed,
      gameCode: live.gameCode,
      playKind: live.playKind,
      protocolVersion: live.protocolVersion,
      logTail: stripSeed(live.logTail),
    };
  }

  if (pool === null) {
    return parsed;
  }

  const finished = await deps.lookupFinished(pool, parsed.lookupCode);
  if (finished === null) {
    return parsed;
  }

  return {
    ...parsed,
    gameCode: finished.gameCode,
    playKind: finished.playKind,
    logTail: stripSeed(finished.logTail),
  };
}

export function mountFeedbackApi(app: Application, deps: FeedbackApiDeps): void {
  app.options('/api/feedback', (req, res) => {
    applyDevCors(req, res, deps.isProduction());
    res.status(204).end();
  });

  app.post('/api/feedback', (req, res) => {
    void handleFeedbackPost(req, res, deps);
  });
}

async function handleFeedbackPost(
  req: Request,
  res: Response,
  deps: FeedbackApiDeps,
): Promise<void> {
  applyDevCors(req, res, deps.isProduction());

  if (!deps.rateLimiter.take(clientIp(req))) {
    res.status(429).json({ ok: false, message: 'Too many reports' });
    return;
  }

  const parsed = parseFeedbackBody(req.body);
  if (parsed === null) {
    res.status(400).json({ ok: false, message: 'Invalid feedback' });
    return;
  }

  const pool = deps.getPool();
  if (pool === null) {
    const message = deps.isProduction()
      ? FEEDBACK_COULD_NOT_SAVE
      : FEEDBACK_NOT_SAVED_NO_DB;
    res.status(503).json({ ok: false, message });
    return;
  }

  try {
    const enriched = await enrichReport(parsed, deps, pool);
    const userAgentHeader = req.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' && userAgentHeader.length > 0
        ? userAgentHeader.slice(0, 512)
        : null;

    await deps.insertReport(pool, {
      kind: enriched.kind,
      message: enriched.message,
      contact: enriched.contact,
      nickname: enriched.nickname,
      gameCode: enriched.gameCode,
      screen: enriched.screen,
      protocolVersion: enriched.protocolVersion,
      playKind: enriched.playKind,
      logTail: stripSeed(enriched.logTail),
      userAgent,
    });

    res.status(200).json({ ok: true });
  } catch {
    res.status(503).json({ ok: false, message: FEEDBACK_COULD_NOT_SAVE });
  }
}
