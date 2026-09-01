import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const screens = join(here, '../screens');

function read(rel: string): string {
  return readFileSync(join(screens, rel), 'utf8');
}

describe('feedback surfaces (technical spec v6 §7.1 / L47-03)', () => {
  it('wires Feedback on Home, Lobby, Table, and Game over', () => {
    const home = read('home.tsx');
    const lobby = read('lobby.tsx');
    const table = read('table.tsx');
    const end = read('end.tsx');
    const economy = read('table/economy-bar.tsx');

    expect(home).toContain('FeedbackDialog');
    expect(home).toContain('screen="home"');
    expect(home).not.toContain('Inbox');
    expect(lobby).toContain('FeedbackDialog');
    expect(lobby).toContain('screen="lobby"');
    expect(table).toContain('FEEDBACK_ARIA_LABEL');
    expect(table).toContain("setFeedbackOpen(true)");
    expect(economy).not.toContain('Feedback');
    expect(end).toContain("mode=\"ask\"");
    expect(end).toContain('markFeedbackAsked');
    expect(end).toContain('hasAskedFeedback');
    expect(end).toContain('onClose={onStatsClose}');
    expect(end).toContain('onLeave={onLeave}');
    expect(end).toContain("reason === 'skip' || reason === 'sent'");
  });
});
