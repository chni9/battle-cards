/**
 * Lobby Ready chrome (L57-11 / L57-16). This is the old-layout half of `lobby-ready.test.ts`'s
 * wiring test, split out by L76-02 (plan A.7; test classification "lobby Ready wiring … variant").
 * Its product half is rendered in `lobby-screen.test.tsx`. L76-12 retires this file along with
 * the V2 chrome.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('lobby Ready wiring (L57-11)', () => {
  it('toggles Ready from view facts and greys Start', () => {
    const lobby = readFileSync(join(here, 'lobby-screen.tsx'), 'utf8');
    expect(lobby).toContain("variant={youReady ? 'orange' : 'green'}");
    expect(lobby).toContain('LobbyReadyCheckIcon');
  });
});
