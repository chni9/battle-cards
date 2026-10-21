/**
 * Feedback surfaces — technical spec v6 §7.1 / L47-03.
 * Home part, split from feedback/feedback-surfaces.test.ts by owner lot (technical spec v7 §12.1, L72-02).
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
  it('wires Feedback on Home, Lobby, Table, and Game over (home)', () => {
    const home = read('home.tsx');

    expect(home).toContain('FeedbackDialog');
    expect(home).toContain('screen="home"');
    expect(home).not.toContain('Inbox');
  });
});
