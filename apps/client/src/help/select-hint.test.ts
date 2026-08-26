/**
 * First-real-game hint selector stub — L46-01.
 * L46-02 replaces the on-turn table; tutorial/skip/spectator guards stay.
 */

import { describe, expect, it } from 'vitest';

import { selectHint, shouldShowFirstGameHints } from './select-hint';
import type { SelectHintInput } from './select-hint';

function input(partial: Partial<SelectHintInput> = {}): SelectHintInput {
  return {
    playKind: 'classic',
    readOnly: false,
    selfEliminated: false,
    isMyTurn: true,
    skipAll: false,
    dismissed: [],
    hasRealIncoming: false,
    hasUnspiedLivingOpponent: true,
    ...partial,
  };
}

describe('shouldShowFirstGameHints (L46-01)', () => {
  it('does not run during tutorial', () => {
    expect(shouldShowFirstGameHints(input({ playKind: 'tutorial' }))).toBe(false);
  });

  it('does not run for spectators or finished inspect', () => {
    expect(shouldShowFirstGameHints(input({ selfEliminated: true }))).toBe(false);
    expect(shouldShowFirstGameHints(input({ readOnly: true }))).toBe(false);
  });

  it('runs on a live Classic seat', () => {
    expect(shouldShowFirstGameHints(input())).toBe(true);
  });
});

describe('selectHint stub (L46-01)', () => {
  it('returns null for tutorial even on your turn', () => {
    expect(selectHint(input({ playKind: 'tutorial' }))).toBeNull();
  });

  it('returns null when skipAll is set', () => {
    expect(selectHint(input({ skipAll: true }))).toBeNull();
  });

  it('returns your-turn on a live Classic turn', () => {
    expect(selectHint(input())).toBe('your-turn');
  });

  it('skips your-turn once dismissed', () => {
    expect(selectHint(input({ dismissed: ['your-turn'] }))).toBeNull();
  });
});
