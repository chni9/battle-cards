/**
 * Lobby kit privacy — L49-02. Other seats must not render a kit id.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('lobby kit privacy (L49-02)', () => {
  it('shows only yourKitSelection, never another seat kit', () => {
    const lobby = readFileSync(join(dir, 'lobby.tsx'), 'utf8');
    expect(lobby).toContain('yourKitSelection');
    expect(lobby).toContain('LobbyKitPickerDialog');
    expect(lobby).toContain('Choose kit');
    expect(lobby).not.toMatch(/player\.kit/);
    expect(lobby).not.toMatch(/players\.map[\s\S]*kitId/);
  });
});
