import { PROTOCOL_VERSION, type FeedbackInboxRow } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import {
  fetchInbox,
  filterInboxByKind,
  parseInboxRow,
  type InboxFetcher,
} from './fetch-inbox';

const sample: FeedbackInboxRow = {
  id: 'row-1',
  createdAt: '2026-09-01T12:00:00.000Z',
  kind: 'bug',
  message: 'Draw felt like a card',
  contact: null,
  nickname: 'Ada',
  gameCode: 'ABCDEF',
  screen: 'table',
  protocolVersion: PROTOCOL_VERSION,
  playKind: 'classic',
  logTail: [{ kind: 'actionPlayed' }],
  userAgent: 'vitest',
};

describe('fetchInbox (technical spec v6 §7.3 / L47-05)', () => {
  it('GETs /api/inbox with the password header and no seed', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const fetchImpl: InboxFetcher = (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([sample]),
      });
    };

    const result = await fetchInbox('inbox-secret', fetchImpl);
    expect(result).toEqual({ ok: true, rows: [sample] });
    expect(capturedUrl).toMatch(/\/api\/inbox$/);
    expect(capturedInit?.method).toBe('GET');
    expect(capturedInit?.headers).toEqual({ 'X-Inbox-Password': 'inbox-secret' });
    expect(JSON.stringify(capturedInit)).not.toContain('seed');
  });

  it('surfaces 401 without parsing rows', async () => {
    const fetchImpl: InboxFetcher = () =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ ok: false }),
      });
    expect(await fetchInbox('nope', fetchImpl)).toEqual({ ok: false, status: 401 });
  });
});

describe('inbox row parse and kind filter (technical spec v6 §7.3 / L47-05)', () => {
  it('rejects a seed-shaped field only if the row is otherwise invalid', () => {
    expect(parseInboxRow(sample)).toEqual(sample);
    expect(parseInboxRow({ ...sample, kind: 'rating' })).toBeNull();
  });

  it('filters by kind on the client', () => {
    const idea: FeedbackInboxRow = { ...sample, id: 'row-2', kind: 'idea' };
    expect(filterInboxByKind([sample, idea], 'all')).toHaveLength(2);
    expect(filterInboxByKind([sample, idea], 'bug')).toEqual([sample]);
  });
});
