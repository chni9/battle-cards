import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INBOX_PASSWORD_STORAGE_KEY, storeInboxPassword } from '../inbox/password-storage';
import {
  ADMIN_RATE_LIMIT_COPY,
  adminErrorCopy,
  adminGet,
  currentAdminSession,
  lockAdminSession,
  subscribeAdminUnauthorized,
  type AdminFetcher,
} from './fetch-admin';

/** A Map-backed `sessionStorage` for the node project, which has none. */
class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  public get length(): number {
    return this.data.size;
  }

  public clear(): void {
    this.data.clear();
  }

  public getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.data.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

function jsonOk(body: unknown, status = 200): AdminFetcher {
  return () =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
}

type AdminFetchResponse = Awaited<ReturnType<AdminFetcher>>;

/** A fetcher whose request stays pending until the test answers it, to order late responses. */
function pendingFetcher(): {
  fetcher: AdminFetcher;
  answer: (status: number, body?: unknown) => void;
} {
  const resolvers: ((response: AdminFetchResponse) => void)[] = [];
  const fetcher: AdminFetcher = () =>
    new Promise<AdminFetchResponse>((resolve) => {
      resolvers.push(resolve);
    });
  const answer = (status: number, body: unknown = {}): void => {
    const resolve = resolvers.at(-1);
    if (resolve === undefined) throw new Error('No request is pending');
    resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
  };
  return { fetcher, answer };
}

describe('adminGet (Lot 61)', () => {
  it('returns status 0 when fetch throws instead of rejecting', async () => {
    const fetchImpl: AdminFetcher = () => Promise.reject(new Error('offline'));
    const result = await adminGet('secret', '/overview', {}, fetchImpl);
    expect(result).toEqual({ ok: false, status: 0 });
  });

  it('returns status 0 when JSON parse throws', async () => {
    const fetchImpl: AdminFetcher = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('bad json')),
      });
    const result = await adminGet('secret', '/overview', {}, fetchImpl);
    expect(result).toEqual({ ok: false, status: 0 });
  });

  it('notifies subscribers and returns 401 without parsing', async () => {
    let locked = 0;
    const unsubscribe = subscribeAdminUnauthorized(() => {
      locked += 1;
    });
    const result = await adminGet('nope', '/overview', {}, jsonOk({ ok: false }, 401));
    unsubscribe();
    expect(result).toEqual({ ok: false, status: 401 });
    expect(locked).toBe(1);
  });

  it('returns overview JSON on 200', async () => {
    const result = await adminGet<{ gameCount: number }>(
      'secret',
      '/overview',
      {},
      jsonOk({ gameCount: 3 }),
    );
    expect(result).toEqual({ ok: true, data: { gameCount: 3 } });
  });
});

describe('adminGet password session (L61-06, L80-01)', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('sessionStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the password in X-Inbox-Password', async () => {
    const inits: RequestInit[] = [];
    const fetchImpl: AdminFetcher = (url, init) => {
      inits.push(init);
      return jsonOk({ gameCount: 0 })(url, init);
    };
    await adminGet('secret', '/overview', {}, fetchImpl);
    expect(inits.map((init) => init.headers)).toStrictEqual([{ 'X-Inbox-Password': 'secret' }]);
  });

  it('a 401 runs lockAdminSession and clears the stored password', async () => {
    storage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'old');
    let locked = 0;
    const unsubscribe = subscribeAdminUnauthorized(() => {
      locked += 1;
    });
    await adminGet('old', '/overview', {}, jsonOk({ ok: false }, 401));
    unsubscribe();
    expect(storage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBeNull();
    expect(locked).toBe(1);
  });

  it('a 429 does not lock the session or clear the stored password', async () => {
    storage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'secret');
    let locked = 0;
    const unsubscribe = subscribeAdminUnauthorized(() => {
      locked += 1;
    });
    const result = await adminGet('secret', '/overview', {}, jsonOk({ ok: false }, 429));
    unsubscribe();
    expect(result).toEqual({ ok: false, status: 429 });
    expect(locked).toBe(0);
    expect(storage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBe('secret');
  });

  it('a success that resolves after sign-out does not store the password again', async () => {
    const { fetcher, answer } = pendingFetcher();
    const pending = adminGet('secret', '/overview', {}, fetcher);
    lockAdminSession();
    answer(200, { gameCount: 1 });
    await pending;
    expect(storage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBeNull();
  });

  it('a 401 from a request started before sign-out does not lock the next session', async () => {
    let locked = 0;
    const unsubscribe = subscribeAdminUnauthorized(() => {
      locked += 1;
    });
    const { fetcher, answer } = pendingFetcher();
    const pending = adminGet('old', '/overview', {}, fetcher);
    lockAdminSession();
    storeInboxPassword('new');
    answer(401, { ok: false });
    const result = await pending;
    unsubscribe();
    expect(result).toEqual({ ok: false, status: 401 });
    expect(locked).toBe(1);
    expect(storage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBe('new');
  });
});

describe('lockAdminSession (L80-02)', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('sessionStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears the key, tells subscribers and starts a new session', () => {
    storage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'secret');
    let locked = 0;
    const unsubscribe = subscribeAdminUnauthorized(() => {
      locked += 1;
    });
    const before = currentAdminSession();
    lockAdminSession();
    unsubscribe();
    expect(currentAdminSession()).toBe(before + 1);
    expect(locked).toBe(1);
    expect(storage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBeNull();
  });

  it('is a no-op for a session that is no longer current', () => {
    const stale = currentAdminSession();
    lockAdminSession();
    storage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'new');
    let locked = 0;
    const unsubscribe = subscribeAdminUnauthorized(() => {
      locked += 1;
    });
    const current = currentAdminSession();
    lockAdminSession(stale);
    unsubscribe();
    expect(currentAdminSession()).toBe(current);
    expect(locked).toBe(0);
    expect(storage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBe('new');
  });

  it('locks for the current session', () => {
    storage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'secret');
    const current = currentAdminSession();
    lockAdminSession(current);
    expect(currentAdminSession()).toBe(current + 1);
    expect(storage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBeNull();
  });
});

describe('adminErrorCopy (Lot 61)', () => {
  it('maps network failure to Could not load', () => {
    expect(adminErrorCopy(0)).toBe('Could not load');
    expect(adminErrorCopy(401)).toBe('Wrong password');
    expect(adminErrorCopy(404)).toBe('Not found');
    expect(adminErrorCopy(503)).toBe('Database unavailable');
  });

  it('maps 429 to the rate-limit copy (technical spec v6 §14)', () => {
    expect(adminErrorCopy(429)).toBe('Too many wrong passwords. Try again in a few minutes.');
    expect(adminErrorCopy(429)).toBe(ADMIN_RATE_LIMIT_COPY);
    expect(adminErrorCopy(500)).toBe('Could not load');
  });
});
