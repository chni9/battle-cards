/**
 * Feedback surfaces — technical spec v6 §7.1 / L47-03.
 * Lobby part, split from feedback/feedback-surfaces.test.ts by owner lot (technical spec v7 §12.1, L72-02).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const screens = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(screens, rel), 'utf8');
}

describe('feedback surfaces (technical spec v6 §7.1 / L47-03)', () => {
  it('wires Feedback on Home, Lobby, Table, and Game over (lobby)', () => {
    const lobby = read('lobby.tsx');

    expect(lobby).toContain('FeedbackDialog');
    expect(lobby).toContain('screen="lobby"');
  });
});
