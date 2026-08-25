/**
 * Reward / reanimation / regen visual pickers — L44-06.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('RewardPanel (L44-06)', () => {
  it('picks resource kinds as chrome tiles and cards as CardChoiceTile', () => {
    const source = readFileSync(join(dir, 'reward-panel.tsx'), 'utf8');
    expect(source).toContain('choiceTileClassName');
    expect(source).toContain('CardChoiceTile');
    expect(source).toContain('REWARD_KIND_COSTS');
    expect(source).toContain("kind: 'elimination-reward'");
    expect(source).toContain('eliminationId: subChoice.eliminationId');
    expect(source).toContain('choices: [choice1, choice2]');
    expect(source).not.toContain('<select');
  });
});
