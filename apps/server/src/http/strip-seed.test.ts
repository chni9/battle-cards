import { describe, expect, it } from 'vitest';

import { STRIP_SEED_MAX_DEPTH, stripSeed, tryStripSeed } from './strip-seed';

function nestArray(depth: number, leaf: unknown): unknown {
  let value: unknown = leaf;
  for (let i = 0; i < depth; i += 1) {
    value = [value];
  }
  return value;
}

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

  it('rejects nesting past STRIP_SEED_MAX_DEPTH without throwing', () => {
    const leaf = { kind: 'actionPlayed', seed: 'secret' };
    const shallow = nestArray(8, leaf);
    const deep = nestArray(STRIP_SEED_MAX_DEPTH + 1, leaf);
    const bomb = nestArray(4000, leaf);

    expect(tryStripSeed(shallow).ok).toBe(true);
    expect(tryStripSeed(deep)).toEqual({ ok: false });
    expect(tryStripSeed(bomb)).toEqual({ ok: false });
    expect(stripSeed(bomb)).toBeNull();
  });
});
