/**
 * Unspy picker uses SeatTile — L58-07 / L44-02.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('Unspy dialog (L58-07)', () => {
  it('picks living spies with SeatTile and sends targetPlayerId', () => {
    const source = readFileSync(join(dir, 'unspy-dialog.tsx'), 'utf8');
    expect(source).toContain('SeatTile');
    expect(source).toContain('visibleKitId');
    expect(source).toContain('onConfirm(resolvedTarget)');
    expect(source).toContain('data-unspy-picker');
    expect(source).toContain('whitespace-nowrap');
    expect(source).toContain('onlySpyId');
    expect(source).toContain('pickedId');
    expect(source).not.toMatch(/type="radio"/);
  });
});
