/** Declared art sources — technical spec v7 §5.5 (L72-10), Appendix A global-art-catalog. */
import { ACTION_CARD_IDS, ATTACK_CARD_IDS, KIT_IDS, SPECIAL_CARD_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { CARD_FILES, KIT_FILES } from './asset-files';

describe('asset-files (technical spec v7 §5.5, L72-10)', () => {
  it('declares one distinct base drawing per card and kit, never an excluded file', () => {
    const cardIds = [...ATTACK_CARD_IDS, ...ACTION_CARD_IDS, ...SPECIAL_CARD_IDS];
    const sources = [...cardIds.map((id) => CARD_FILES[id].base), ...KIT_IDS.map((id) => KIT_FILES[id])];
    expect(sources).toHaveLength(47);
    expect(new Set(sources).size).toBe(47);
    for (const name of sources) {
      expect(name).not.toMatch(/\(dead\)|^Draw\.png$|_button\.png$/);
      expect(name).not.toMatch(/activated/);
    }
  });
});
