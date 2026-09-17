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

/** Clear the stored secret and show the password gate again (401). */
export function lockAdminSession(): void {
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
  try {
    const response = await fetchImpl(url.toString(), {
      headers: { 'X-Inbox-Password': password },
    });
    if (response.status === 401) {
      lockAdminSession();
    }
    if (!response.ok) {
      return { ok: false, status: response.status };
    }
    const data = (await response.json()) as T;
    storeInboxPassword(password);
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
