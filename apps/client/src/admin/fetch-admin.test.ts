import { describe, expect, it } from 'vitest';

import {
  adminErrorCopy,
  adminGet,
  subscribeAdminUnauthorized,
  type AdminFetcher,
} from './fetch-admin';

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

describe('adminErrorCopy (Lot 61)', () => {
  it('maps network failure to Could not load', () => {
    expect(adminErrorCopy(0)).toBe('Could not load');
    expect(adminErrorCopy(401)).toBe('Wrong password');
    expect(adminErrorCopy(404)).toBe('Not found');
    expect(adminErrorCopy(503)).toBe('Database unavailable');
  });
});
