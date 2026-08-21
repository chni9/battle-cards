/**
 * Table flag intent — L43-05 / technical spec v6 §6.1.
 */

import { describe, expect, it } from 'vitest';

import { tableFlagIntent } from './table-flag-intent';

describe('tableFlagIntent (L43-05)', () => {
  it('hides the flag on a read-only finished board', () => {
    expect(tableFlagIntent({ readOnly: true, selfEliminated: false })).toBe('hidden');
    expect(tableFlagIntent({ readOnly: true, selfEliminated: true })).toBe('hidden');
  });

  it('uses forfeit while alive and leave-table after elimination', () => {
    expect(tableFlagIntent({ readOnly: false, selfEliminated: false })).toBe('forfeit');
    expect(tableFlagIntent({ readOnly: false, selfEliminated: true })).toBe('leaveTable');
  });
});
