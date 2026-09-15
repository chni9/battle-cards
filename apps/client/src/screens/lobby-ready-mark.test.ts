/**
 * Lobby Ready marks — L57-16.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('lobby Ready marks (L57-16)', () => {
  it('uses a fixed-width check/cross column left of the nickname', () => {
    const mark = readFileSync(join(here, 'lobby-ready-mark.tsx'), 'utf8');
    expect(mark).toContain('w-6 shrink-0');
    expect(mark).toContain('text-cta-green-deep');
    expect(mark).toContain('text-cta-red');
    expect(mark).toContain('lobbyReadyLabel');

    const lobby = readFileSync(join(here, 'lobby.tsx'), 'utf8');
    const markIndex = lobby.indexOf('<LobbyReadyStatusMark');
    const nickIndex = lobby.indexOf('{player.nickname}');
    expect(markIndex).toBeGreaterThan(0);
    expect(nickIndex).toBeGreaterThan(markIndex);
  });
});
