/**
 * SeatTile wiring — L44-01 / technical spec v6 §6.4.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('SeatTile (L44-01)', () => {
  it('uses seatIndexOf, KitPortrait, and choiceTileClassName', () => {
    const source = readFileSync(join(dir, 'seat-tile.tsx'), 'utf8');
    expect(source).toContain('seatIndexOf');
    expect(source).toContain('seatZoneStyle');
    expect(source).toContain('KitPortrait');
    expect(source).toContain('PlayerName');
    expect(source).toContain('choiceTileClassName');
  });
});
