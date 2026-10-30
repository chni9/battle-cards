/**
 * Test-only fetch stub and URL helper for the admin component tests (L80-01). Shipped code never
 * imports this file; later Lot 80 tasks extend it only by adding exports (plan Appendix A).
 *
 * `installFakeFetch()` replaces the global `fetch`, which `adminGet` and `fetchInbox` read at call
 * time, so a page under test needs no injected fetcher. Every call stays pending until the test
 * answers it, which lets a test order responses (a late success, a stale 401). Each answer runs
 * inside RTL `act` and then drains the microtasks the page's `.then` chain needs, so the DOM has
 * settled when `respond` or `fail` resolves.
 *
 * Importing this module registers an `afterEach` that restores `fetch`, clears `sessionStorage`
 * (the stored inbox password) and puts the URL back on `/`.
 */

import { act } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

export interface FakeFetchCall {
  readonly url: URL;
  /** `init.method`, or `'GET'` when absent. */
  readonly method: string;
  /** Header names lower-cased: `headers['x-inbox-password']`. */
  readonly headers: Readonly<Record<string, string>>;
  /** `JSON.parse(init.body)`, or `undefined` when the request has no string body. */
  readonly jsonBody: unknown;
  respond(status: number, body?: unknown): Promise<void>;
  /** A network error: the fetch promise rejects, as an offline `fetch` does. */
  fail(): Promise<void>;
}

export interface FakeFetch {
  readonly calls: readonly FakeFetchCall[];
  to(pathname: string): readonly FakeFetchCall[];
  /** The latest call to `pathname`; throws when there is none. */
  last(pathname: string): FakeFetchCall;
}

/** What the admin and inbox clients read from a response. */
type FakeResponse = Pick<Response, 'ok' | 'status' | 'json'>;

/**
 * Microtask turns drained after an answer: the fetch promise, `adminGet`'s two awaits, `json()`,
 * its async return and the page's `.then` take about ten; twenty leaves headroom.
 */
const SETTLE_TURNS = 20;

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  history.replaceState({}, '', '/');
});

async function settle(answer: () => void): Promise<void> {
  await act(async () => {
    answer();
    for (let turn = 0; turn < SETTLE_TURNS; turn += 1) await Promise.resolve();
  });
}

/** happy-dom's `Headers` keeps the caller's casing when iterated (the Fetch spec lower-cases). */
function lowerCaseHeaders(init: HeadersInit | undefined): Record<string, string> {
  const headers: Record<string, string> = {};
  new Headers(init).forEach((value, name) => {
    headers[name.toLowerCase()] = value;
  });
  return headers;
}

export function installFakeFetch(): FakeFetch {
  const calls: FakeFetchCall[] = [];
  const fakeFetch = (input: string | URL, init: RequestInit = {}): Promise<FakeResponse> =>
    new Promise<FakeResponse>((resolve, reject) => {
      const body = init.body;
      const jsonBody: unknown = typeof body === 'string' ? JSON.parse(body) : undefined;
      calls.push({
        url: new URL(input),
        method: init.method ?? 'GET',
        headers: lowerCaseHeaders(init.headers),
        jsonBody,
        respond: (status, responseBody) =>
          settle(() => {
            resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(responseBody) });
          }),
        fail: () =>
          settle(() => {
            reject(new TypeError('Failed to fetch'));
          }),
      });
    });
  vi.stubGlobal('fetch', fakeFetch);
  const to = (pathname: string): readonly FakeFetchCall[] =>
    calls.filter((call) => call.url.pathname === pathname);
  return {
    calls,
    to,
    last: (pathname) => {
      const call = to(pathname).at(-1);
      if (call === undefined) throw new Error(`No fetch to ${pathname} yet`);
      return call;
    },
  };
}

/** Puts the page on an admin path before the tree mounts; no `popstate` fires. */
export function setAdminPath(path: string): void {
  history.replaceState({}, '', path);
}
