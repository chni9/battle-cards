import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../db/migrations/010_feedback_triage_mark_lot_68.sql'),
  'utf8',
);

describe('010 feedback triage marks (L68-12)', () => {
  it('marks this pass done or eliminated and leaves the curse report pending', () => {
    expect(sql).toContain("SET status = 'done'");
    expect(sql).toContain("SET status = 'eliminated'");
    expect(sql).toContain('Nigga');
    expect(sql).toContain('Ghost should have tax');
    expect(sql).not.toContain('Curse shouldn');
    expect(sql).not.toContain('Alpha did not play');
    expect(sql).not.toMatch(/\bseed\b/);
  });
});
