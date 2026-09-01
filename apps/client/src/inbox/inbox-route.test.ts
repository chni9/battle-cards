import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..');

function read(rel: string): string {
  return readFileSync(join(src, rel), 'utf8');
}

describe('inbox route (technical spec v6 §7.3 / L47-05)', () => {
  it('renders /inbox before game phases and does not link it from the hub', () => {
    const app = read('App.tsx');
    const home = read('screens/home.tsx');
    const inbox = read('screens/inbox.tsx');

    const inboxBranch = app.indexOf("pathname === '/inbox'");
    const gameApp = app.indexOf('<GameApp');
    const homeScreen = app.indexOf('<HomeScreen');
    expect(inboxBranch).toBeGreaterThan(0);
    expect(gameApp).toBeGreaterThan(inboxBranch);
    expect(homeScreen).toBeGreaterThan(gameApp);

    expect(home).not.toContain('Inbox');
    expect(home).not.toContain('/inbox');
    expect(inbox).not.toContain('Delete');
    expect(inbox).not.toContain('Edit');
  });

  it('does not fetch rows until a password is submitted or already stored', () => {
    const inbox = read('screens/inbox.tsx');
    expect(inbox).toContain('readStoredInboxPassword');
    expect(inbox).toContain('loadRows(password.trim())');
    expect(inbox).toContain('if (stored === null)');
    expect(inbox).toContain('fetchInbox(stored)');
    expect(inbox).not.toMatch(/useEffect\(\(\) => \{\s*void fetchInbox\('/);
  });
});
