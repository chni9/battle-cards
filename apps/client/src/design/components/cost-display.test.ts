/**
 * CostDisplay native title — L59-01 hover must not steal a parent button name.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('CostDisplay title (L59-01)', () => {
  it('lets a parent omit the spoken-cost tooltip', () => {
    const source = readFileSync(join(dir, 'cost-display.tsx'), 'utf8');
    expect(source).toContain('title?: string | null');
    expect(source).toContain('title: titleOverride');
    expect(source).toContain(
      'const tooltip = titleOverride === undefined ? spoken : (titleOverride ?? undefined);',
    );
    expect(source).toContain('title={tooltip}');
  });
});
