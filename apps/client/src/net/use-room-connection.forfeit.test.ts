/**
 * FORFEIT client intent — L43-06 / technical spec v6 §6.3.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('forfeit intent (L43-06)', () => {
  it('sends FORFEIT without setting intentionalLeave or leaving the room', () => {
    const source = readFileSync(join(dir, 'use-room-connection.ts'), 'utf8');
    const forfeitFn = /const forfeit = useCallback\(\(\): void => \{[\s\S]*?\}, \[\]\);/.exec(
      source,
    )?.[0];

    expect(forfeitFn).toBeDefined();
    expect(forfeitFn).toContain('roomRef.current?.send(FORFEIT)');
    expect(forfeitFn).not.toContain('intentionalLeave');
    expect(forfeitFn).not.toContain('room.leave');
  });
});
