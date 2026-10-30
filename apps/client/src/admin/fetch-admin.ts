/**
 * Password-gated admin API client (Lot 61 / technical spec v6 §14).
 */

import type {
  AdminGameDetail,
  AdminGamesPage,
  AdminKitStats,
  AdminOverview,
  AdminTablePage,
} from '@card-battle/shared';

import { resolveServerUrl } from '../net/resolve-server-url';
import {
  clearStoredInboxPassword,
  storeInboxPassword,
} from '../inbox/password-storage';

export type AdminFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number };

export type AdminFetcher = (
  url: string,
  init: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

export function subscribeAdminUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

/**
 * What the server says to a wrong password once the shared IP limiter trips (technical spec v6
 * §14, `respondInboxAuthFailure`). It is the copy of the gate and of every page, Feedback included.
 */
export const ADMIN_RATE_LIMIT_COPY = 'Too many wrong passwords. Try again in a few minutes.';

/**
 * Counts locks. A request captures it before it starts, so a response that arrives after a lock
 * (Sign out or a 401) cannot undo it: it neither stores the old password again nor locks the
 * session the designer unlocked since (spec v7 §7.8, L80-02). A counter rather than an
 * `AbortController` keeps the gate probe, every page and Feedback's two direct calls on one rule
 * with no per-call wiring.
 */
let adminSession = 0;

export function currentAdminSession(): number {
  return adminSession;
}

/**
 * Clear the stored secret and show the password gate again, for a 401 and for Sign out. A call
 * that names a `session` which is no longer current is a no-op: it belongs to a request that
 * started before an earlier lock.
 */
export function lockAdminSession(session?: number): void {
  if (session !== undefined && session !== adminSession) {
    return;
  }
  adminSession += 1;
  clearStoredInboxPassword();
  for (const listener of unauthorizedListeners) {
    listener();
  }
}

function apiBase(): string {
  const loc =
    typeof window !== 'undefined'
      ? {
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          origin: window.location.origin,
        }
      : undefined;
  return `${resolveServerUrl(import.meta.env.VITE_SERVER_URL, loc)}/api/admin`;
}

export async function adminGet<T>(
  password: string,
  path: string,
  query?: Record<string, string>,
  fetchImpl: AdminFetcher = fetch,
): Promise<AdminFetchResult<T>> {
  const url = new URL(`${apiBase()}${path}`);
  if (query !== undefined) {
    for (const [key, value] of Object.entries(query)) {
      if (value.length > 0) {
        url.searchParams.set(key, value);
      }
    }
  }
  const session = currentAdminSession();
  try {
    const response = await fetchImpl(url.toString(), {
      headers: { 'X-Inbox-Password': password },
    });
    if (response.status === 401) {
      lockAdminSession(session);
    }
    if (!response.ok) {
      return { ok: false, status: response.status };
    }
    const data = (await response.json()) as T;
    if (session === currentAdminSession()) {
      storeInboxPassword(password);
    }
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0 };
  }
}

export function adminErrorCopy(status: number): string {
  if (status === 401) {
    return 'Wrong password';
  }
  if (status === 404) {
    return 'Not found';
  }
  if (status === 429) {
    return ADMIN_RATE_LIMIT_COPY;
  }
  if (status === 503) {
    return 'Database unavailable';
  }
  return 'Could not load';
}

export function fetchAdminOverview(
  password: string,
  query: Record<string, string>,
): Promise<AdminFetchResult<AdminOverview>> {
  return adminGet(password, '/overview', query);
}

export function fetchAdminGames(
  password: string,
  query: Record<string, string>,
): Promise<AdminFetchResult<AdminGamesPage>> {
  return adminGet(password, '/games', query);
}

export function fetchAdminGameDetail(
  password: string,
  gameId: string,
): Promise<AdminFetchResult<AdminGameDetail>> {
  return adminGet(password, `/games/${encodeURIComponent(gameId)}`);
}

export function fetchAdminKitStats(
  password: string,
  query: Record<string, string>,
): Promise<AdminFetchResult<AdminKitStats>> {
  return adminGet(password, '/kit-stats', query);
}

export function fetchAdminTable(
  password: string,
  table: string,
  query: Record<string, string>,
): Promise<AdminFetchResult<AdminTablePage>> {
  return adminGet(password, `/tables/${encodeURIComponent(table)}`, query);
}
