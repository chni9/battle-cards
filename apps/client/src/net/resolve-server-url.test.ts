import { describe, expect, it } from 'vitest';

import { resolveServerUrl } from './resolve-server-url';

describe('resolveServerUrl (Coolify same-origin deploy)', () => {
  it('uses VITE_SERVER_URL when set', () => {
    expect(
      resolveServerUrl('https://api.example.com', {
        protocol: 'https:',
        hostname: 'game.example.com',
        origin: 'https://game.example.com',
      }),
    ).toBe('https://api.example.com');
  });

  it('defaults to localhost:2567 when hostname is localhost', () => {
    expect(
      resolveServerUrl(undefined, {
        protocol: 'http:',
        hostname: 'localhost',
        origin: 'http://localhost:5173',
      }),
    ).toBe('http://localhost:2567');
  });

  it('defaults to localhost:2567 when hostname is 127.0.0.1', () => {
    expect(
      resolveServerUrl('', {
        protocol: 'http:',
        hostname: '127.0.0.1',
        origin: 'http://127.0.0.1:5173',
      }),
    ).toBe('http://localhost:2567');
  });

  it('uses page origin (not :2567) on a non-local host', () => {
    expect(
      resolveServerUrl(undefined, {
        protocol: 'https:',
        hostname: 'cards.example.com',
        origin: 'https://cards.example.com',
      }),
    ).toBe('https://cards.example.com');
  });
});
