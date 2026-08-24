/**
 * Target Dialog uses SeatTile — L44-02 / technical spec v6 §6.4.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('target Dialog (L44-02)', () => {
  it('picks seats with SeatTile and still sends targetPlayerId', () => {
    const source = readFileSync(join(dir, 'card-actions.tsx'), 'utf8');
    expect(source).toContain('SeatTile');
    expect(source).toContain('visibleKitId');
    expect(source).toContain('targetPlayerId: resolvedTarget');
    expect(source).not.toMatch(/type="radio"/);
    expect(source).not.toContain('name="card-target"');
  });
});
