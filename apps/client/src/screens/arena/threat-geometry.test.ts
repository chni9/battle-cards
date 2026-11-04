/** Threat geometry: spec v7 §6.5 (one arrow per effect, fan side by side, hits-all burst, grid shows POV arrows), L74-06. */
import { describe, expect, it } from 'vitest';

import { V7_COLORS, v7SeatColor } from '../../ui/palette';
import type { SeatLayout } from '../../view-model/seat-layout';
import { makePending, makeTableView } from '../../view-model/test-fixtures';
import { threats, type ThreatsModel } from '../../view-model/threats';
import { arrowPath, arrowStroke, fanOutMarks, threatArrows } from './threat-geometry';

const ARENA = { width: 400, height: 300 }; // portrait plate centre: (200, 252)
const ARC: SeatLayout = {
  kind: 'arc',
  mode: 'portrait',
  placements: [
    { playerId: 'p1', centerX: 100, centerY: 100 },
    { playerId: 'p2', centerX: 300, centerY: 100 },
    { playerId: 'p3', centerX: 200, centerY: 40 },
  ],
};
const GRID: SeatLayout = { kind: 'grid', mode: 'portrait', rows: [['p1', 'p2', 'p3']] };

function modelOf(pending: Parameters<typeof makePending>[0][]): ThreatsModel {
  return threats(makeTableView(['me', 'p1', 'p2', 'p3'], { pendingEffects: pending.map(makePending) }), null);
}
function arrowsOf(model: ThreatsModel, layout: SeatLayout = ARC, tappedSeatId: string | null = null) {
  return threatArrows({ model, layout, arena: ARENA, povId: 'me', tappedSeatId });
}

describe('arrowPath', () => {
  it('trims both ends and leaves room for the head', () => {
    expect(arrowPath({ x: 0, y: 0 }, { x: 100, y: 0 }, { trimStart: 10, trimEnd: 10, offset: 0 })).toEqual({
      d: 'M 10 0 L 82 0',
      head: 'M 90 0 L 82 -5 L 82 5 Z',
      label: { x: 50, y: 0 },
    });
  });

  it('shifts a positive offset to the left of travel (up, for a rightward arrow)', () => {
    expect(arrowPath({ x: 0, y: 0 }, { x: 100, y: 0 }, { trimStart: 10, trimEnd: 10, offset: 6 })?.d).toBe('M 10 -6 L 82 -6');
  });

  it('gives null when the trims and the head leave no shaft, or both ends are one point', () => {
    expect(arrowPath({ x: 0, y: 0 }, { x: 15, y: 0 }, { trimStart: 10, trimEnd: 10, offset: 0 })).toBeNull();
    // Two adjacent grid seats: 84 px apart, 2 × 40 px of trims, no room for the 8 px head.
    expect(arrowPath({ x: 0, y: 0 }, { x: 84, y: 0 }, { trimStart: 40, trimEnd: 40, offset: 0 })).toBeNull();
    expect(arrowPath({ x: 5, y: 5 }, { x: 5, y: 5 }, { trimStart: 0, trimEnd: 0, offset: 0 })).toBeNull();
  });
});

describe('threatArrows (§6.5)', () => {
  it('fans two effects between one pair side by side, one label each (never a sum)', () => {
    const arrows = arrowsOf(modelOf([
      { id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'strong-attack', queuedAt: 7 },
      { id: 'e2', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack', queuedAt: 7 },
    ]));
    expect(arrows.map((a) => [a.entry.effectId, a.geometry.d, a.entry.label])).toEqual([
      ['e1', 'M 140 106 L 252 106', { kind: 'damage', amount: 2 }],
      ['e2', 'M 140 94 L 252 94', { kind: 'damage', amount: 1 }],
    ]);
  });

  it('separates a mutual pair instead of drawing both on one line', () => {
    const arrows = arrowsOf(modelOf([
      { id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'strong-attack' },
      { id: 'e2', sourcePlayerId: 'p2', targetPlayerId: 'p1', cardId: 'strong-attack' },
    ]));
    expect(arrows.map((a) => a.geometry.d)).toEqual(['M 140 106 L 252 106', 'M 260 94 L 148 94']);
  });

  it('trims at the seat edge in every mode: a desktop seat is 120 px wide, so its arrows stop 62 px from the centre, not 40 (Check 1)', () => {
    const desktop: SeatLayout = {
      kind: 'arc',
      mode: 'desktop',
      placements: [
        { playerId: 'p1', centerX: 100, centerY: 100 },
        { playerId: 'p2', centerX: 700, centerY: 100 },
      ],
    };
    const model = modelOf([{ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'strong-attack' }]);
    const [arrow] = threatArrows({ model, layout: desktop, arena: { width: 800, height: 400 }, povId: 'me', tappedSeatId: null });
    // Half the 120 px seat is 60 px; the 2 px gap keeps the shaft and the tip outside the seat box.
    expect(arrow?.geometry.d).toBe('M 162 100 L 630 100');
    expect(arrow?.geometry.head).toMatch(/^M 638 100 /);
    // The portrait and landscape seats are 76 px wide: the same 2 px gap gives the 40 px trim they always had.
    expect(arrowsOf(modelOf([{ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'strong-attack' }]))[0]?.geometry.d).toBe('M 140 100 L 252 100');
  });

  it('ends incoming arrows at the plate and starts outgoing ones there', () => {
    const [incoming, outgoing] = arrowsOf(modelOf([
      { id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'spy' },
      { id: 'e2', sourcePlayerId: 'me', targetPlayerId: 'p2', cardId: 'spy' },
    ]));
    expect(incoming?.to).toEqual({ x: 200, y: 252 });
    expect(outgoing?.from).toEqual({ x: 200, y: 252 });
  });

  it('draws no arrow for fan-out members or a self-queued effect', () => {
    const model = modelOf([
      { id: 'm1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'mega-attack', queuedAt: 9 },
      { id: 'm2', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'mega-attack', queuedAt: 9 },
      { id: 'm3', sourcePlayerId: 'p1', targetPlayerId: 'p3', cardId: 'mega-attack', queuedAt: 9 },
      { id: 's1', sourcePlayerId: 'me', targetPlayerId: 'me', cardId: 'suicide' },
    ]);
    expect(arrowsOf(model)).toEqual([]);
  });

  it('in grid mode draws only arrows to and from the POV; a tapped seat adds its own', () => {
    const model = modelOf([
      { id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'spy' },
      { id: 'e2', sourcePlayerId: 'p3', targetPlayerId: 'p1', cardId: 'spy' },
    ]);
    expect(arrowsOf(model, GRID).map((a) => a.entry.effectId)).toEqual(['e1']);
    expect(arrowsOf(model, GRID, 'p3').map((a) => a.entry.effectId)).toEqual(['e1', 'e2']);
  });

  it('highlights the tapped seat in and out arrows, and nothing while no seat is tapped', () => {
    const model = modelOf([
      { id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'spy' },
      { id: 'e2', sourcePlayerId: 'p3', targetPlayerId: 'p1', cardId: 'spy' },
      { id: 'e3', sourcePlayerId: 'p2', targetPlayerId: 'p3', cardId: 'spy' },
    ]);
    expect(arrowsOf(model).map((a) => a.highlighted)).toEqual([null, null, null]);
    expect(arrowsOf(model, ARC, 'p1').map((a) => a.highlighted)).toEqual([true, true, false]);
  });
});

describe('fanOutMarks (§6.5)', () => {
  it('bursts the POV play on the plate with one badge per target seat corner', () => {
    const [mark] = fanOutMarks({
      model: modelOf(['p1', 'p2', 'p3'].map((t, i) => ({ id: `m${String(i)}`, sourcePlayerId: 'me', targetPlayerId: t, cardId: 'mega-attack' as const, queuedAt: 9 }))),
      layout: ARC, arena: ARENA, povId: 'me',
    });
    expect(mark?.burst).toEqual({ x: 200, y: 252 });
    expect(mark?.targets.map((t) => [t.playerId, t.at])).toEqual([
      ['p1', { x: 128, y: 64 }],
      ['p2', { x: 328, y: 64 }],
      ['p3', { x: 228, y: 4 }],
    ]);
  });

  it('bursts a third-party play on its seat and leaves the POV copy to the plate', () => {
    const [mark] = fanOutMarks({
      model: modelOf(['me', 'p2', 'p3'].map((t, i) => ({ id: `m${String(i)}`, sourcePlayerId: 'p1', targetPlayerId: t, cardId: 'mega-attack' as const, queuedAt: 9 }))),
      layout: ARC, arena: ARENA, povId: 'me',
    });
    expect(mark?.burst).toEqual({ x: 100, y: 100 });
    expect(mark?.targets.map((t) => t.playerId)).toEqual(['p2', 'p3']);
  });
});

describe('arrowStroke (§6.5 ends and colours)', () => {
  it('tones incoming by threat, outgoing as mine, third party by the source seat hue', () => {
    const model = modelOf([
      { id: 'a', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack' },
      { id: 'b', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'spy' },
      { id: 'c', sourcePlayerId: 'me', targetPlayerId: 'p1', cardId: 'spy' },
      { id: 'd', sourcePlayerId: 'p2', targetPlayerId: 'p3', cardId: 'strong-attack' },
    ]);
    expect(model.entries.map(arrowStroke)).toEqual([
      V7_COLORS['threat-attack'],
      V7_COLORS['threat-other'],
      V7_COLORS.mine,
      v7SeatColor(model.entries[3]?.sourceSeatColorIndex ?? -1),
    ]);
  });
});
