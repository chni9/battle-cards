/**
 * Unspy client intent — L58-07.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('clearSpy intent (L58-07)', () => {
  it('sends CLEAR_SPY with targetPlayerId', () => {
    const source = readFileSync(join(dir, 'use-room-connection.ts'), 'utf8');
    expect(source).toContain('CLEAR_SPY');
    expect(source).toContain('roomRef.current?.send(CLEAR_SPY, { targetPlayerId })');
  });
});
