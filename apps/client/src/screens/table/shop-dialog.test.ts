/**
 * Shop buy cells use shared choice chrome — L44-01.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('shop buy cells (L44-01)', () => {
  it('uses choiceTileClassName and keeps Buy / double-click / CostDisplay', () => {
    const source = readFileSync(join(dir, 'shop-dialog.tsx'), 'utf8');
    expect(source).toContain('choiceTileClassName');
    expect(source).toContain('onDoubleClick');
    expect(source).toContain('CostDisplay');
    expect(source).toContain('CARD_BUY_LABEL');
  });
});
