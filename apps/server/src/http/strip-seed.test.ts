import { describe, expect, it } from 'vitest';

import { stripSeed } from './strip-seed';

describe('stripSeed (technical spec v6 §7.1 / L47-02)', () => {
  it('removes seed at any depth and leaves public log fields', () => {
    const cleaned = stripSeed({
      kind: 'actionPlayed',
      seed: 'secret',
      nested: { seed: 'inner', turnSequence: 2 },
      list: [{ seed: 'row', kind: 'actionResolved' }],
    });

    expect(cleaned).toEqual({
      kind: 'actionPlayed',
      nested: { turnSequence: 2 },
      list: [{ kind: 'actionResolved' }],
    });
    expect(JSON.stringify(cleaned)).not.toContain('seed');
  });

  it('passes through primitives and null', () => {
    expect(stripSeed(null)).toBeNull();
    expect(stripSeed(3)).toBe(3);
    expect(stripSeed('ok')).toBe('ok');
  });
});
