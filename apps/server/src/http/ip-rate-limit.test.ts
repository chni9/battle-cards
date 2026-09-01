import { describe, expect, it } from 'vitest';

import { createIpRateLimiter } from './ip-rate-limit';

describe('createIpRateLimiter (technical spec v6 §7.1 / L47-02)', () => {
  it('allows 10 hits then 429s inside the window', () => {
    let now = 1_000;
    const limiter = createIpRateLimiter(10, 10 * 60 * 1000, () => now);

    for (let i = 0; i < 10; i += 1) {
      expect(limiter.take('1.1.1.1')).toBe(true);
    }
    expect(limiter.take('1.1.1.1')).toBe(false);
    expect(limiter.take('2.2.2.2')).toBe(true);

    now += 10 * 60 * 1000 + 1;
    expect(limiter.take('1.1.1.1')).toBe(true);
  });
});
