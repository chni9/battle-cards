import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..');

function read(rel: string): string {
  return readFileSync(join(src, rel), 'utf8');
}

describe('inbox redirect (Lot 61-09)', () => {
  it('redirects /inbox to /admin/feedback and keeps GET /api/inbox client', () => {
    const app = read('App.tsx');
    const fetchInbox = read('inbox/fetch-inbox.ts');
    const feedback = read('screens/admin/admin-feedback-page.tsx');
    expect(app).toContain("window.location.replace('/admin/feedback')");
    expect(fetchInbox).toContain('/api/inbox');
    expect(feedback).toContain('fetchInbox');
  });
});
