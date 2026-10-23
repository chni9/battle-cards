/**
 * Tutorial completion must not skip first-game hints — L46-03 / spec §5.2.
 * The source-text checks live beside the files they read (technical spec v7 §12.1, L72-02).
 */

import { describe, expect, it } from 'vitest';

import { EMPTY_HINT_STATE, resetHelpStorage } from './help-storage';
import { selectHint } from '../view-model/select-hint';

describe('tutorial does not skip first-game hints (L46-03)', () => {
  it('Classic Solo/Online stays eligible after an empty tutorial-complete blob', () => {
    expect(EMPTY_HINT_STATE.skipAll).toBe(false);
    expect(
      selectHint({
        playKind: 'classic',
        readOnly: false,
        selfEliminated: false,
        isMyTurn: true,
        skipAll: false,
        dismissed: [],
        hasIncomingAttack: false,
        hasIncomingThief: false,
        hasRewardChoice: false,
        hasUnspiedLivingOpponent: true,
      }),
    ).toBe('your-turn');
  });

  it('Reset help remains the clear path', () => {
    expect(resetHelpStorage.toString()).toContain('HINTS_STORAGE_KEY');
  });
});
