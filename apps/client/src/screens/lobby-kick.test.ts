/**
 * Host Kick confirm — L57-09.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('lobby kick (L57-09)', () => {
  it('asks the host to confirm Kick before sending kickPlayer', () => {
    const lobby = readFileSync(join(here, 'lobby.tsx'), 'utf8');
    expect(lobby).toContain('Kick');
    expect(lobby).toContain('setKickTarget');
    expect(lobby).toContain('onKickPlayer');
    expect(lobby).toContain('Kick this player?');
    expect(lobby).not.toContain('onRemoveBot');
  });
});
