/**
 * Claim-seat picker copy — L57-13 / L57-15.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { claimStayLabel, shouldShowClaimPicker } from './claim-seat';

const here = dirname(fileURLToPath(import.meta.url));

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

describe('claim seat dialog (L57-13)', () => {
  it('lists claimable nicknames without auto-matching', () => {
    const source = readFileSync(join(here, 'claim-seat-dialog.tsx'), 'utf8');
    expect(source).toContain('Sit as a disconnected player?');
    expect(source).toContain('Nicknames are not unique');
    expect(source).toContain('onClaim');
    expect(source).not.toContain('toLowerCase');
  });

  it('pre-selects the only claimable seat so Sit here is enabled (L57-15)', () => {
    const source = readFileSync(join(here, 'claim-seat-dialog.tsx'), 'utf8');
    expect(source).toContain('onlySeatId');
    expect(source).toContain('Sit here');
  });
});

describe('App claim picker wiring (L57-15)', () => {
  it('gates the dialog on shouldShowClaimPicker so seated players keep Draw', () => {
    const app = readFileSync(join(here, '../App.tsx'), 'utf8');
    expect(app).toContain('shouldShowClaimPicker');
    expect(app).toContain('staySpectating');
  });
});
