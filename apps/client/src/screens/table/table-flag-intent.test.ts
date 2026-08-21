/**
 * Table flag intent — L43-05 / technical spec v6 §6.1.
 */

import { describe, expect, it } from 'vitest';

import { tableFlagIntent, tableFlagLeaveAction } from './table-flag-intent';

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

describe('tableFlagLeaveAction (L43-06)', () => {
  it('maps alive to forfeit, spectator to leaveGame, finished board to hidden', () => {
    expect(tableFlagLeaveAction({ readOnly: false, selfEliminated: false })).toBe('forfeit');
    expect(tableFlagLeaveAction({ readOnly: false, selfEliminated: true })).toBe('leaveGame');
    expect(tableFlagLeaveAction({ readOnly: true, selfEliminated: false })).toBe('hidden');
  });
});
