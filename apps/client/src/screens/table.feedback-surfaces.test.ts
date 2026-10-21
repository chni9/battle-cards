/**
 * Feedback surfaces — technical spec v6 §7.1 / L47-03.
 * Table part, split from feedback/feedback-surfaces.test.ts by owner lot (technical spec v7 §12.1, L72-02).
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
  it('wires Feedback on Home, Lobby, Table, and Game over (table)', () => {
    const table = read('table.tsx');
    const economy = read('table/economy-bar.tsx');

    expect(table).toContain('FEEDBACK_ARIA_LABEL');
    expect(table).toMatch(
      /aria-label=\{FEEDBACK_ARIA_LABEL\}[\s\S]*?>\s*!\s*<\/IconButton>/,
    );
    expect(economy).not.toContain('Feedback');
    expect(table).toContain("setFeedbackOpen(true)");
    expect(table).toContain('onOpenFeedback !== undefined');
    expect(table).toContain('{onOpenFeedback === undefined ? (');
  });
});
