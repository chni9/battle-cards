/**
 * Mirror panel visual pickers — L44-03.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('MirrorPanel (L44-03)', () => {
  it('picks eligible attacks as CardChoiceTile and seats as SeatTile', () => {
    const source = readFileSync(join(dir, 'mirror-panel.tsx'), 'utf8');
    expect(source).toContain('CardChoiceTile');
    expect(source).toContain('SeatTile');
    expect(source).toContain('eligibleEffectIds');
    expect(source).toContain("kind: 'mirror'");
    expect(source).toContain('pendingEffectId: resolvedEffectId');
    expect(source).toContain('newTargetPlayerId: resolvedTargetId');
    expect(source).toContain('→ you');
    expect(source).not.toContain('<select');
  });
});
