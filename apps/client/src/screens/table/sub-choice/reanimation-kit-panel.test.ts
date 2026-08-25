/**
 * Reanimation kit visual picker — L44-06.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('ReanimationKitPanel (L44-06)', () => {
  it('wraps kit portraits with choiceTileClassName, not SeatTile', () => {
    const source = readFileSync(join(dir, 'reanimation-kit-panel.tsx'), 'utf8');
    expect(source).toContain('choiceTileClassName');
    expect(source).toContain('KitPortrait');
    expect(source).toContain("kind: 'reanimation-kit'");
    expect(source).toContain('kitId: resolvedKitId');
    expect(source).not.toContain('SeatTile');
  });
});
