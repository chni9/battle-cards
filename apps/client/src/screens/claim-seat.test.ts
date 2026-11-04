/**
 * Claim-seat picker helpers: L57-13, L57-15, L57-16. The pure suites moved unchanged from
 * `claim-seat-dialog.test.ts` (L76-16, technical spec v7 §12.1, §12.2); the dialog's tests are
 * `claim-seat-dialog.test.tsx`.
 */

import { describe, expect, it } from 'vitest';

import { claimSelection, claimStayLabel, shouldShowClaimPicker, walkInSeesPrivateHands } from './claim-seat';

describe('claimStayLabel (L57-13)', () => {
  it('keeps a lobby guest on their new seat and spectates otherwise', () => {
    expect(claimStayLabel({ isSpectator: false, phase: 'lobby' })).toBe('Keep this seat');
    expect(claimStayLabel({ isSpectator: true, phase: 'lobby' })).toBe('Stay spectating');
    expect(claimStayLabel({ isSpectator: true, phase: 'playing' })).toBe('Stay spectating');
  });
});

describe('shouldShowClaimPicker (L57-15)', () => {
  it('hides the picker from a living seated player during play', () => {
    expect(
      shouldShowClaimPicker({
        claimableCount: 1,
        isSpectator: false,
        phase: 'playing',
        youAreHost: true,
      }),
    ).toBe(false);
    expect(
      shouldShowClaimPicker({
        claimableCount: 1,
        isSpectator: false,
        phase: 'playing',
        youAreHost: false,
      }),
    ).toBe(false);
  });

  it('shows the picker to walk-in spectators and lobby guests', () => {
    expect(
      shouldShowClaimPicker({
        claimableCount: 1,
        isSpectator: true,
        phase: 'playing',
        youAreHost: false,
      }),
    ).toBe(true);
    expect(
      shouldShowClaimPicker({
        claimableCount: 1,
        isSpectator: false,
        phase: 'lobby',
        youAreHost: false,
      }),
    ).toBe(true);
    expect(
      shouldShowClaimPicker({
        claimableCount: 1,
        isSpectator: false,
        phase: 'lobby',
        youAreHost: true,
      }),
    ).toBe(false);
  });
});

describe('walkInSeesPrivateHands (L57-16)', () => {
  it('follows whether any seat carries a Spy overlay', () => {
    expect(walkInSeesPrivateHands([{}])).toBe(false);
    expect(
      walkInSeesPrivateHands([
        { spied: { kitId: 'warrior', hand: [], specialCards: [] } },
      ]),
    ).toBe(true);
  });
});

describe('claimSelection (L57-15, Review Focus 5)', () => {
  it('keeps a pick while it is listed, else pre-selects a sole seat, else picks nothing', () => {
    const ana = { playerId: 'p-ana' };
    const bo = { playerId: 'p-bo' };
    expect(claimSelection([ana], null)).toBe('p-ana');
    expect(claimSelection([ana, bo], null)).toBeNull();
    expect(claimSelection([ana, bo], 'p-bo')).toBe('p-bo');
    expect(claimSelection([ana, bo], 'p-cy')).toBeNull(); // the pick left the set
    expect(claimSelection([bo], 'p-cy')).toBe('p-bo');
    expect(claimSelection([], null)).toBeNull();
  });
});
