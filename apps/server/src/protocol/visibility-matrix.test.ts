/**
 * Walk-in Spy overlay gate — L57-16.
 */

import { describe, expect, it } from 'vitest';

import { walkInSpectatorSeesPrivate } from './visibility-matrix';

describe('walkInSpectatorSeesPrivate (L57-16)', () => {
  it('withholds kits while claimable seats exist and Stay is not confirmed', () => {
    expect(
      walkInSpectatorSeesPrivate({ claimableCount: 1, stayConfirmed: false }),
    ).toBe(false);
  });

  it('grants the overlay after Stay or when the picker is empty', () => {
    expect(
      walkInSpectatorSeesPrivate({ claimableCount: 2, stayConfirmed: true }),
    ).toBe(true);
    expect(
      walkInSpectatorSeesPrivate({ claimableCount: 0, stayConfirmed: false }),
    ).toBe(true);
  });
});
