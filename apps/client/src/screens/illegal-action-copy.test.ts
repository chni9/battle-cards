/**
 * Exhaustiveness for client illegal-action copy — L39-02.
 */

import {
  ACTION_REJECT_CODES,
  type ActionRejectCode,
} from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import {
  ILLEGAL_ACTION_COPY,
  resolveIllegalActionCopy,
} from './illegal-action-copy';

describe('ILLEGAL_ACTION_COPY (L39-02)', () => {
  it('gives every ActionRejectCode a non-empty body', () => {
    for (const code of ACTION_REJECT_CODES) {
      const entry = ILLEGAL_ACTION_COPY[code];
      expect(entry.body.length).toBeGreaterThan(0);
      const resolved = resolveIllegalActionCopy(code, 'fallback');
      expect(resolved.body).toBe(entry.body);
      expect(resolved.title.length).toBeGreaterThan(0);
    }
  });

  it('covers Record keys exhaustively over ACTION_REJECT_CODES', () => {
    const keys = Object.keys(ILLEGAL_ACTION_COPY) as ActionRejectCode[];
    expect(keys.sort()).toEqual([...ACTION_REJECT_CODES].sort());
  });

  it('falls back to wire message when code is undefined', () => {
    const resolved = resolveIllegalActionCopy(undefined, 'Server said no.');
    expect(resolved.title).toBe("Can't do that");
    expect(resolved.body).toBe('Server said no.');
  });
});
