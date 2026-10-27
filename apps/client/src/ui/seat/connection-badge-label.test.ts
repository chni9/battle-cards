/**
 * Seat connection badge copy — L10-04, parity `global-connection-badge` (technical spec v7
 * Appendix A). The strings and the 3 / 5 thresholds are V2's, unchanged.
 */

import type { PublicPlayerView } from '@card-battle/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { connectionBadgeLabel, type ConnectionBadgePlayer } from './connection-badge-label';

type Overrides = Partial<ConnectionBadgePlayer['connection']> & { isEliminated?: boolean };

const fakeSeat = ({ isEliminated = false, ...connection }: Overrides = {}): ConnectionBadgePlayer => ({
  isEliminated,
  connection: { status: 'connected', automaticTurnsTaken: 0, consecutiveTimeouts: 0, ...connection },
});

const label = (overrides?: Overrides) => connectionBadgeLabel(fakeSeat(overrides));

describe('connectionBadgeLabel (L10-04 · global-connection-badge)', () => {
  it('returns null for a connected seat with no timeouts', () => {
    expect(label()).toBeNull();
  });

  it('labels an eliminated seat first, whatever its connection', () => {
    expect(label({ isEliminated: true })).toBe('eliminated');
    expect(label({ isEliminated: true, status: 'disconnected' })).toBe('eliminated');
    expect(label({ isEliminated: true, status: 'absent', automaticTurnsTaken: 2 })).toBe('eliminated');
  });

  it('labels the reconnect grace window', () => {
    expect(label({ status: 'disconnected', consecutiveTimeouts: 3 })).toBe('disconnected — grace');
  });

  it('counts automatic turns out of 3 while absent, ahead of timeouts', () => {
    expect(label({ status: 'absent' })).toBe('absent 0/3');
    expect(label({ status: 'absent', automaticTurnsTaken: 2, consecutiveTimeouts: 4 })).toBe('absent 2/3');
  });

  it('counts idle timeouts out of 5 while connected', () => {
    expect(label({ consecutiveTimeouts: 1 })).toBe('idle timeouts 1/5');
    expect(label({ consecutiveTimeouts: 4 })).toBe('idle timeouts 4/5');
  });

  it('accepts a PublicPlayerView seat as is', () => {
    expectTypeOf<PublicPlayerView>().toExtend<ConnectionBadgePlayer>();
  });
});
