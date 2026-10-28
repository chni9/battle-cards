import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INBOX_PASSWORD_STORAGE_KEY } from '../inbox/password-storage';
import {
  adminErrorCopy,
  adminGet,
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
});

describe('adminErrorCopy (Lot 61)', () => {
  it('maps network failure to Could not load', () => {
    expect(adminErrorCopy(0)).toBe('Could not load');
    expect(adminErrorCopy(401)).toBe('Wrong password');
    expect(adminErrorCopy(404)).toBe('Not found');
    expect(adminErrorCopy(503)).toBe('Database unavailable');
  });
});
