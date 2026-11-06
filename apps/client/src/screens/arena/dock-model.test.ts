/**
 * Dock model: technical spec v7 §6.1 item 5; L58-09, L59-01, L64-05; A.8 ruling 4 (L74-13).
 */
import { describe, expect, it } from 'vitest';

import type { UnspyControl } from '../../view-model/self-strip';
import {
  DOCK_ICON_ONLY_MAX_WIDTH_PX,
  dockHasControls,
  dockIconOnly,
  drawAriaLabel,
  drawPulseKey,
  resolvedSpyId,
  unspyAriaLabel,
} from './dock-model';

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

describe('the icon-only dock (designer 2026-11-06, S2)', () => {
  it('is landscape-compact under 700 px of viewport width, so 667×375 is icon-only and 844×390 is not', () => {
    expect(DOCK_ICON_ONLY_MAX_WIDTH_PX).toBe(700);
    expect([
      dockIconOnly({ width: 667, height: 375 }),
      dockIconOnly({ width: 699, height: 390 }),
      dockIconOnly({ width: 700, height: 390 }),
      dockIconOnly({ width: 844, height: 390 }),
    ]).toEqual([true, true, false, false]);
  });

  it('never applies outside landscape-compact: a 360×740 phone and a narrow desktop keep their words', () => {
    expect([dockIconOnly({ width: 360, height: 740 }), dockIconOnly({ width: 600, height: 500 }), dockIconOnly({ width: 520, height: 800 })]).toEqual([
      false,
      false,
      false,
    ]);
  });
});
