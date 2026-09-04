import { PROTOCOL_VERSION } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { submitFeedback, type FeedbackFetcher } from './submit-feedback';

function bodyText(body: BodyInit | null | undefined): string {
  return typeof body === 'string' ? body : '';
}

describe('submitFeedback (technical spec v6 §7.1 / L47-03)', () => {
  it('POSTs JSON to resolveServerUrl /api/feedback', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const fetchImpl: FeedbackFetcher = (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });
    };

    const result = await submitFeedback(
      {
        kind: 'idea',
        message: 'Ship it',
        screen: 'home',
        protocolVersion: PROTOCOL_VERSION,
      },
      fetchImpl,
    );

    expect(result).toEqual({ ok: true });
    expect(capturedUrl).toMatch(/\/api\/feedback$/);
    expect(capturedInit?.method).toBe('POST');
    expect(bodyText(capturedInit?.body)).not.toContain('seed');
  });

  it('surfaces the server message on failure', async () => {
    const fetchImpl: FeedbackFetcher = () =>
      Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({ ok: false, message: 'Not saved (no database)' }),
      });

    const result = await submitFeedback(
      {
        kind: 'bug',
        message: 'Local',
        screen: 'home',
        protocolVersion: PROTOCOL_VERSION,
      },
      fetchImpl,
    );

    expect(result).toEqual({ ok: false, message: 'Not saved (no database)' });
  });
});
