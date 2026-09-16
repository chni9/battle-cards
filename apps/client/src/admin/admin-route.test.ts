import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..');

function read(rel: string): string {
  return readFileSync(join(src, rel), 'utf8');
}

describe('admin route (Lot 61-06)', () => {
  it('renders /admin before game phases and redirects /inbox to feedback', () => {
    const app = read('App.tsx');
    const home = read('screens/home.tsx');
    expect(app).toContain("path.startsWith('/admin/')");
    expect(app).toContain("window.location.replace('/admin/feedback')");
    expect(app).toContain('<AdminApp');
    expect(home).not.toContain('/admin');
    expect(home).not.toContain('/inbox');
  });

  it('reuses inbox password session storage', () => {
    const admin = read('screens/admin/admin-app.tsx');
    const fetchAdmin = read('admin/fetch-admin.ts');
    expect(admin).toContain('readStoredInboxPassword');
    expect(fetchAdmin).toContain('X-Inbox-Password');
  });
});
