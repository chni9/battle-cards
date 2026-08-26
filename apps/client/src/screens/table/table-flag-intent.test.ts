/**
 * Table flag intent — L43-05 / technical spec v6 §6.1.
 * Designer 2026-08-21 follow-up: finished inspect keeps Return home.
 */

import { describe, expect, it } from 'vitest';

import {
  tableFlagAriaLabel,
  tableFlagIntent,
  tableFlagLeaveAction,
} from './table-flag-intent';

describe('tableFlagIntent (L43-05)', () => {
  it('keeps Return home on a read-only finished board', () => {
    expect(tableFlagIntent({ readOnly: true, selfEliminated: false })).toBe('returnHome');
    expect(tableFlagIntent({ readOnly: true, selfEliminated: true })).toBe('returnHome');
  });

  it('uses forfeit while alive and leave-table after elimination', () => {
    expect(tableFlagIntent({ readOnly: false, selfEliminated: false })).toBe('forfeit');
    expect(tableFlagIntent({ readOnly: false, selfEliminated: true })).toBe('leaveTable');
  });

  it('uses Skip tutorial instead of Forfeit during a tutorial match (L45-04)', () => {
    expect(
      tableFlagIntent({ readOnly: false, selfEliminated: false, playKind: 'tutorial' }),
    ).toBe('skipTutorial');
    expect(tableFlagLeaveAction({ readOnly: false, selfEliminated: false, playKind: 'tutorial' })).toBe(
      'leaveGame',
    );
  });
});

describe('tableFlagLeaveAction (L43-06)', () => {
  it('maps alive to forfeit, spectator and finished board to leaveGame', () => {
    expect(tableFlagLeaveAction({ readOnly: false, selfEliminated: false })).toBe('forfeit');
    expect(tableFlagLeaveAction({ readOnly: false, selfEliminated: true })).toBe('leaveGame');
    expect(tableFlagLeaveAction({ readOnly: true, selfEliminated: false })).toBe('leaveGame');
  });
});

describe('tableFlagAriaLabel', () => {
  const labels = {
    forfeit: 'Forfeit',
    leaveTable: 'Leave table',
    returnHome: 'Return home',
    skipTutorial: 'Skip tutorial',
  };

  it('hides no control for finished inspect', () => {
    expect(tableFlagAriaLabel('returnHome', labels)).toBe('Return home');
    expect(tableFlagAriaLabel('skipTutorial', labels)).toBe('Skip tutorial');
    expect(tableFlagAriaLabel('hidden', labels)).toBeNull();
  });
});
