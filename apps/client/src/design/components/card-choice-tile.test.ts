/**
 * CardChoiceTile hidden face — L44-01 / technical spec v6 §6.4.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('CardChoiceTile (L44-01)', () => {
  it('uses the attack verso for hidden cards, not the opponent placeholder', () => {
    const source = readFileSync(join(dir, 'card-choice-tile.tsx'), 'utf8');
    expect(source).toContain("getCardBackUrl('attack')");
    expect(source).not.toContain('getOpponentPlaceholderUrl');
    expect(source).toContain('HIDDEN_CARD_CAPTION');
    expect(source).toContain('choiceTileClassName');
  });
});
