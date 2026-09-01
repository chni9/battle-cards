import { describe, expect, it } from 'vitest';

import { timingSafeEqualUtf8 } from './timing-safe-equal';

describe('timingSafeEqualUtf8 (technical spec v6 §7.3 / L47-04)', () => {
  it('accepts equal passwords and rejects length or content mismatches', () => {
    expect(timingSafeEqualUtf8('inbox-secret', 'inbox-secret')).toBe(true);
    expect(timingSafeEqualUtf8('inbox-secret', 'inbox-secreT')).toBe(false);
    expect(timingSafeEqualUtf8('short', 'longer-password')).toBe(false);
    expect(timingSafeEqualUtf8('', 'x')).toBe(false);
  });
});
