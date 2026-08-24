/**
 * Target Dialog uses SeatTile — L44-02 / technical spec v6 §6.4.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('card-actions visual pickers (L44-02 / L44-04)', () => {
  const source = readFileSync(join(dir, 'card-actions.tsx'), 'utf8');

  it('picks seats with SeatTile and still sends targetPlayerId (L44-02)', () => {
    expect(source).toContain('SeatTile');
    expect(source).toContain('visibleKitId');
    expect(source).toContain('targetPlayerId: resolvedTarget');
    expect(source).not.toMatch(/type="radio"/);
    expect(source).not.toContain('name="card-target"');
  });

  it('picks Assassin attacks as CardChoiceTile plus per-line SeatTile (L44-04)', () => {
    expect(source).toContain('CardChoiceTile');
    expect(source).toContain('onPlayMultipleAttacks');
    expect(source).not.toMatch(/type="checkbox"/);
    expect(source).not.toContain('<select');
  });
});
