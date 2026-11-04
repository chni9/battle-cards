/** When App clears the shared reject: technical spec v7 §7.2 (Q26, Q29), A.9 ruling 7 (L76-14). */
import { describe, expect, it } from 'vitest';

import { shouldClearRejectOnPhaseChange } from './reject-phase';

describe('shouldClearRejectOnPhaseChange (A.9 ruling 7)', () => {
  it('clears on a change between two phases: lobby → playing, playing → finished, finished → lobby', () => {
    expect(shouldClearRejectOnPhaseChange('lobby', 'playing')).toBe(true);
    expect(shouldClearRejectOnPhaseChange('playing', 'finished')).toBe(true);
    expect(shouldClearRejectOnPhaseChange('finished', 'lobby')).toBe(true);
  });

  it('never clears within a phase, or to or from Home (no room)', () => {
    for (const phase of ['lobby', 'playing', 'finished'] as const) {
      expect(shouldClearRejectOnPhaseChange(phase, phase)).toBe(false);
      expect(shouldClearRejectOnPhaseChange(null, phase)).toBe(false);
      expect(shouldClearRejectOnPhaseChange(phase, null)).toBe(false);
    }
    expect(shouldClearRejectOnPhaseChange(null, null)).toBe(false);
  });
});
