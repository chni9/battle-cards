/**
 * A lobby leave promotes the next host through nextLobbyHostId, never the first seat:
 * a bot added before a guest joined sits there (decisions.md L1-02, technical spec v3 §6).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, 'game-room.ts'), 'utf8');

describe('unseatLobbySeat host promotion', () => {
  it('picks the next host from the remaining seats and the connected players', () => {
    const fn = source.slice(
      source.indexOf('private unseatLobbySeat'),
      source.indexOf('private bindSession'),
    );
    expect(fn).toContain('nextLobbyHostId({');
    expect(fn).toContain('remainingSeats: this.seats');
    expect(fn).toContain('connectedPlayerIds: this.connectedSeatedPlayerIds()');
    expect(fn).not.toContain('this.seats[0]');
  });
});
