/**
 * GET /api/inbox from the SPA (technical spec v6 §7.3 / L47-05).
 * Kind filter stays client-side. Never includes seed in the request.
 */

import {
  isFeedbackKind,
  isFeedbackScreen,
  normalizeFeedbackTopics,
  type FeedbackInboxRow,
  type FeedbackKind,
  type FeedbackTopic,
  type PlayKind,
} from '@card-battle/shared';

import { resolveServerUrl } from '../net/resolve-server-url';

export type InboxFetcher = (
  url: string,
  init: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

export type InboxLoadResult =
  | { ok: true; rows: FeedbackInboxRow[] }
  | { ok: false; status: number };

function pageLocation(): { protocol: string; hostname: string; origin: string } | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return {
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    origin: window.location.origin,
  };
}

function optionalText(value: unknown): string | null | undefined {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  return value;
}

function playKindOf(value: unknown): PlayKind | null | undefined {
  if (value === undefined || value === null) {
    return null;
  }
  if (value === 'classic' || value === 'tutorial') {
    return value;
  }
  return undefined;
}

export function parseInboxRow(value: unknown): FeedbackInboxRow | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const id: unknown = Reflect.get(value, 'id');
  const createdAt: unknown = Reflect.get(value, 'createdAt');
  const kind: unknown = Reflect.get(value, 'kind');
  const message: unknown = Reflect.get(value, 'message');
  const screen: unknown = Reflect.get(value, 'screen');
  const protocolVersion: unknown = Reflect.get(value, 'protocolVersion');
  if (typeof id !== 'string' || id.length === 0) {
    return null;
  }
  if (typeof createdAt !== 'string' || createdAt.length === 0) {
    return null;
  }
  if (!isFeedbackKind(kind) || !isFeedbackScreen(screen)) {
    return null;
  }
  if (typeof message !== 'string') {
    return null;
  }
  if (typeof protocolVersion !== 'number' || !Number.isInteger(protocolVersion)) {
    return null;
  }
  const contact = optionalText(Reflect.get(value, 'contact'));
  const nickname = optionalText(Reflect.get(value, 'nickname'));
  const gameCode = optionalText(Reflect.get(value, 'gameCode'));
  const userAgent = optionalText(Reflect.get(value, 'userAgent'));
  const playKind = playKindOf(Reflect.get(value, 'playKind'));
  if (
    contact === undefined ||
    nickname === undefined ||
    gameCode === undefined ||
    userAgent === undefined ||
    playKind === undefined
  ) {
    return null;
  }
  const topics = normalizeFeedbackTopics(Reflect.get(value, 'topics') ?? []);
  if (topics === null) {
    return null;
  }
  return {
    id,
    createdAt,
    kind,
    message,
    contact,
    nickname,
    gameCode,
    screen,
    protocolVersion,
    playKind,
    logTail: Reflect.get(value, 'logTail') ?? null,
    userAgent,
    topics,
  };
}

export function parseInboxRows(value: unknown): FeedbackInboxRow[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const rows: FeedbackInboxRow[] = [];
  for (const item of value) {
    const row = parseInboxRow(item);
    if (row === null) {
      return null;
    }
    rows.push(row);
  }
  return rows;
}

export function filterInboxByKind(
  rows: readonly FeedbackInboxRow[],
  kind: FeedbackKind | 'all',
): readonly FeedbackInboxRow[] {
  return filterInbox(rows, kind, 'all');
}

export function filterInbox(
  rows: readonly FeedbackInboxRow[],
  kind: FeedbackKind | 'all',
  topic: FeedbackTopic | 'all',
): readonly FeedbackInboxRow[] {
  return rows.filter((row) => {
    if (kind !== 'all' && row.kind !== kind) {
      return false;
    }
    return topic === 'all' || row.topics.includes(topic);
  });
}

export async function fetchInbox(
  password: string,
  fetchImpl: InboxFetcher = fetch,
): Promise<InboxLoadResult> {
  const url = `${resolveServerUrl(import.meta.env.VITE_SERVER_URL, pageLocation())}/api/inbox`;
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { 'X-Inbox-Password': password },
    });
    if (!response.ok) {
      return { ok: false, status: response.status };
    }
    const json: unknown = await response.json().catch(() => null);
    const rows = parseInboxRows(json);
    if (rows === null) {
      return { ok: false, status: 500 };
    }
    return { ok: true, rows };
  } catch {
    return { ok: false, status: 0 };
  }
}
