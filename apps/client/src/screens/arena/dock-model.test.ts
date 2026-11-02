/**
 * Dock model: technical spec v7 §6.1 item 5; L58-09, L59-01, L64-05; A.8 ruling 4 (L74-13).
 */
import { describe, expect, it } from 'vitest';

import type { UnspyControl } from '../../view-model/self-strip';
import { dockHasControls, drawAriaLabel, drawPulseKey, resolvedSpyId, unspyAriaLabel } from './dock-model';

const control = (spyIds: readonly string[]): UnspyControl => ({
  cost: { kind: 'points', amount: 10 },
  spyIds,
  preselectedSpyId: spyIds.length === 1 ? (spyIds[0] ?? null) : null,
  enabled: true,
  reason: null,
});

describe('dock model', () => {
  it("keeps V2's spoken Draw and Unspy names (pt / pts)", () => {
    expect([drawAriaLabel(1), drawAriaLabel(37)]).toEqual(['Draw, plus 1 pt', 'Draw, plus 37 pts']);
    expect(unspyAriaLabel({ kind: 'points', amount: 10 })).toBe('Unspy, minus 10 pts');
  });

  it('pulses at every own turn start and payout change, never off-turn', () => {
    const turn5 = drawPulseKey({ isMyTurn: true, turnSequence: 5, gain: 10 });
    expect(drawPulseKey({ isMyTurn: false, turnSequence: 5, gain: 10 })).toBeNull();
    expect(turn5).not.toBeNull();
    expect(drawPulseKey({ isMyTurn: true, turnSequence: 5, gain: 37 })).not.toBe(turn5);
    expect(drawPulseKey({ isMyTurn: true, turnSequence: 6, gain: 10 })).not.toBe(turn5);
    expect(drawPulseKey({ isMyTurn: true, turnSequence: 5, gain: 10 })).toBe(turn5);
  });

  it('resolves the spy pick: a living pick, else the single spy, else none', () => {
    expect(resolvedSpyId(control(['p1']), null)).toBe('p1');
    expect(resolvedSpyId(control(['p1', 'p2']), null)).toBeNull();
    expect(resolvedSpyId(control(['p1', 'p2']), 'p2')).toBe('p2');
    expect(resolvedSpyId(control(['p1']), 'p2')).toBe('p1');
  });

  it('has controls unless every entry is null (walk-in, Q38)', () => {
    expect(dockHasControls({ draw: null, shop: null, unspy: null, duplication: null, stats: false })).toBe(false);
    expect(dockHasControls({ draw: null, shop: { browseOnly: true }, unspy: null, duplication: null, stats: true })).toBe(true);
  });

  it('counts Stats: a walk-in on the finished board has a Stats-only dock (L74-24)', () => {
    expect(dockHasControls({ draw: null, shop: null, unspy: null, duplication: null, stats: true })).toBe(true);
  });
});
