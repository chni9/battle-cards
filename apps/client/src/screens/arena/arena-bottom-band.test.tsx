// @vitest-environment happy-dom
/**
 * The compact bottom band on the arena: designer 2026-11-03 "Bas plus court" (decisions.md);
 * controller ruling R5; plan Appendix A.6 and Review Focus 4; technical spec v7 §6.1, §6.4 (L75-13).
 */
import type { PlayingStateView } from '@card-battle/shared';
import { fireEvent, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi, type RenderUiOptions } from '../../test/render';
import { heightBoundHandCardWidthPx } from '../../ui/card/hand-card-size';
import { layoutSeats, SEAT_BOX, type LayoutBox } from '../../view-model/seat-layout';
import { makeCard, makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { BAND_HYSTERESIS_PX, bandSavingsPx, bottomBandSavingsPx, COMPACT_HAND_CARD_W_PX, PLATE_FOOTPRINT_PX, plateOverlapPx } from './bottom-band';
import { SEAT_GRID_GAP_PX } from './seat-geometry';
import {
  ARENA_TEST_BOXES,
  arenaSpies,
  expectNoArenaIntent,
  makeArenaProps,
  makeArenaView,
  stubArenaLayout,
  type ArenaLayoutStub,
  type ArenaLayoutStubOptions,
} from './test-view';

const eight = (): PlayingStateView => makeArenaView({ seatCount: 8, overrides: { self: makeSelf({ points: 10, hand: [makeCard('spy')] }) } });
let layout: ArenaLayoutStub | null = null;
afterEach(() => { layout?.restore(); layout = null; });
function setupAt(box: LayoutBox, view: PlayingStateView, options: RenderUiOptions = {}, layoutOptions: ArenaLayoutStubOptions = {}) {
  const stub = stubArenaLayout(box.viewport, box.arena, layoutOptions);
  layout = stub;
  const onPlayCard = vi.fn<ArenaScreenProps['onPlayCard']>();
  const props = makeArenaProps({ view, onPlayCard });
  return { stub, props, onPlayCard, ...renderUi(<ArenaScreen {...props} />, options) };
}
function one(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`no ${selector}`);
  return found;
}
const PRIMARY = { pointerId: 1, isPrimary: true, button: 0 } as const;
const band = (): string | null => one('main[data-arena="next"]').getAttribute('data-bottom-band');
const strip = (): string | null => one('[data-self-strip]').getAttribute('data-self-strip');
const handWidth = (): string => one('[data-hand-fan]').style.getPropertyValue('--hand-card-w');
/** The full band's arena clears two grid rows (8 px gutter + 92 px each) over the 122 px footprint. */
const THRESHOLD = 2 * (SEAT_GRID_GAP_PX + SEAT_BOX.portrait.height) + PLATE_FOOTPRINT_PX;

/**
 * The rects a lift measures (`measureDropZones`), as `arena-mode-crossing.test.tsx` gives them: p1's seat
 * alone holds the release point, and every other seat sits clear of it. Under the stub's default every
 * element reports the arena box, so all seven seats would hold it, `dropTarget` would resolve nothing,
 * and a release would send nothing with or without the cancel.
 */
function seatRectFor(element: Element): DOMRect | undefined {
  if (element.getAttribute('data-zone') !== 'opponent-seat') return undefined;
  return element.getAttribute('data-player-id') === 'p1' ? new DOMRect(0, 0, 100, 100) : new DOMRect(250, 100, 76, 92);
}
const ATTACK_VIEW = (): PlayingStateView =>
  makeArenaView({ seatCount: 8, overrides: { self: makeSelf({ points: 10, hand: [makeCard('basic-attack', { instanceId: 'atk-1' })] }) } });
const PRESS = { clientX: 100, clientY: 700 };
const LIFT = { clientX: 103, clientY: 688 };
const RELEASE = { clientX: 50, clientY: 50 };
const ghost = (): Element | null => document.querySelector('[data-zone="hand-drag-ghost"]');
const pressAndLift = (): void => {
  fireEvent.pointerDown(within(one('[data-arena-region="hand"]')).getByRole('button', { name: 'Basic attack, 1 damage' }), { ...PRIMARY, ...PRESS });
  fireEvent.pointerMove(window, { ...PRIMARY, ...LIFT });
};

describe('the Watching header compacts with the band (designer 2026-11-06, S3)', () => {
  /** What the plate covers once the band has given back this POV's real saving to a 360×740 arena. */
  const overlapAfterCompacting = (view: PlayingStateView): number => {
    const { viewport, arena } = ARENA_TEST_BOXES.phone360;
    const grown = { width: arena.width, height: arena.height + bandSavingsPx(view, viewport.width) };
    return plateOverlapPx(layoutSeats(view, { viewport, arena: grown }), grown, PLATE_FOOTPRINT_PX);
  };

  it('an eliminated POV at 360×740 with 8 seats goes compact: the strip and its Watching header, one row; no seat is left under the plate', () => {
    const view = makeArenaView({ seatCount: 8, pov: 'eliminated', overrides: { currentTurnPlayerId: 'p1' } });
    const { props } = setupAt(ARENA_TEST_BOXES.phone360, view);
    expect([band(), strip(), one('[data-pov-strip]').getAttribute('data-watching-header')]).toEqual(['compact', 'compact', 'compact']);
    expect(within(one('[data-pov-strip]')).getByRole('button', { name: 'Leave table' })).toBeTruthy();
    expect(overlapAfterCompacting(view)).toBeLessThanOrEqual(0);
    expectNoArenaIntent(props);
  });

  it('a walk-in at 360×740 with 8 seats goes compact too, and keeps Claim a seat and Leave table', () => {
    const view = makeArenaView({ seatCount: 8, pov: 'walk-in' });
    const stub = stubArenaLayout(ARENA_TEST_BOXES.phone360.viewport, ARENA_TEST_BOXES.phone360.arena);
    layout = stub;
    const props = makeArenaProps({ view, onReopenClaim: vi.fn() });
    renderUi(<ArenaScreen {...props} />);
    expect([band(), one('[data-spectator-strip]').getAttribute('data-spectator-strip'), one('[data-pov-strip]').getAttribute('data-watching-header')]).toEqual(['compact', 'compact', 'compact']);
    const header = within(one('[data-pov-strip]'));
    expect([header.getByRole('button', { name: 'Claim a seat' }), header.getByRole('button', { name: 'Leave table' })]).toHaveLength(2);
    expect(overlapAfterCompacting(view)).toBeLessThanOrEqual(0);
  });

  it('keeps the full Watching strip while the band is full (3 seats at 360×740)', () => {
    setupAt(ARENA_TEST_BOXES.phone360, makeArenaView({ seatCount: 3, pov: 'walk-in' }));
    expect([band(), one('[data-spectator-strip]').getAttribute('data-spectator-strip'), one('[data-pov-strip]').getAttribute('data-watching-header')]).toEqual(['full', 'full', 'full']);
  });
});

describe('the compact bottom band (R5)', () => {
  it('compacts at 360×740 with 8 seats: one-row strip, 52 px hand cards, the dock keeps its controls, every anchor stays', () => {
    const { props } = setupAt(ARENA_TEST_BOXES.phone360, eight());
    expect([band(), strip(), handWidth()]).toEqual(['compact', 'compact', `${String(COMPACT_HAND_CARD_W_PX)}px`]);
    const dock = one('[data-arena-region="dock"]');
    expect([
      within(dock).getByRole('button', { name: /^Draw, plus / }),
      within(dock).getByRole('button', { name: 'Shop' }),
      within(dock).getByRole('button', { name: /^Unspy/ }),
    ]).toHaveLength(3);
    for (const selector of ['[data-zone="resources"][data-hint-anchor="resources"]', '[data-zone="private-zone"] [data-zone="kit-portrait"]', '[data-zone="hand"][data-hint-anchor="hand"]', '[data-zone="specials"][data-hint-anchor="specials"]']) {
      expect(document.querySelector(selector)).not.toBeNull();
    }
    expectNoArenaIntent(props);
  });

  it.each([
    { label: '4 seats at 360×740', box: ARENA_TEST_BOXES.phone360, seatCount: 4 },
    { label: '8 seats on a 768×1024 tablet', box: ARENA_TEST_BOXES.tablet, seatCount: 8 },
  ])('keeps the full band for $label', ({ box, seatCount }) => {
    setupAt(box, makeArenaView({ seatCount }));
    expect([band(), strip(), handWidth()]).toEqual(['full', 'full', '']);
  });

  it('stays compact when the arena grows by exactly the savings, across two more ResizeObserver callbacks (Review Focus 4)', () => {
    const { viewport, arena } = ARENA_TEST_BOXES.phone360;
    const { stub } = setupAt(ARENA_TEST_BOXES.phone360, eight());
    expect(band()).toBe('compact');
    const grown = arena.height + bottomBandSavingsPx(viewport.width);
    stub.setArena(arena.width, grown);
    expect(band()).toBe('compact');
    stub.setArena(arena.width, grown);
    stub.setArena(arena.width, grown);
    expect(band()).toBe('compact');
  });

  it('returns to the full band once the full band would clear the plate by BAND_HYSTERESIS_PX (S1)', () => {
    const { viewport, arena } = ARENA_TEST_BOXES.phone360;
    const { stub } = setupAt(ARENA_TEST_BOXES.phone360, eight());
    stub.setArena(arena.width, THRESHOLD + bottomBandSavingsPx(viewport.width) + BAND_HYSTERESIS_PX - 1);
    expect(band()).toBe('compact');
    stub.setArena(arena.width, THRESHOLD + bottomBandSavingsPx(viewport.width) + BAND_HYSTERESIS_PX);
    expect([band(), strip(), handWidth()]).toEqual(['full', 'full', '']);
  });

  it('is never compact in landscape-compact or on desktop', () => {
    const { stub } = setupAt(ARENA_TEST_BOXES.phone360, eight());
    stub.setViewport(844, 390);
    expect([band(), strip(), handWidth()]).toEqual(['full', 'compact', `${String(heightBoundHandCardWidthPx(390))}px`]);
    stub.setViewport(1440, 900);
    expect([band(), strip(), handWidth()]).toEqual(['full', 'full', '']);
  });

  it('control: with no band flip, the same press, lift and release on the compact band plays the card on p1', () => {
    const { props, onPlayCard } = setupAt(ARENA_TEST_BOXES.phone360, ATTACK_VIEW(), { reducedMotion: true }, { rectFor: seatRectFor });
    expect(band()).toBe('compact');
    pressAndLift();
    expect(ghost()).not.toBeNull();
    fireEvent.pointerUp(window, { ...PRIMARY, ...RELEASE });
    expect(onPlayCard.mock.calls).toEqual([['atk-1', { targetPlayerId: 'p1' }]]);
    expect(arenaSpies(props).filter((spy) => spy.mock.calls.length > 0)).toHaveLength(1);
  });

  it('cancels a lifted drag when the band flips under it, and sends nothing, though its release lands on a valid seat (A.5.3)', () => {
    // The arena height, the strip and the hand card width all change with the band, so the drop rects measured at lift are stale.
    const { viewport, arena } = ARENA_TEST_BOXES.phone360;
    const { stub, props } = setupAt(ARENA_TEST_BOXES.phone360, ATTACK_VIEW(), { reducedMotion: true }, { rectFor: seatRectFor });
    expect(band()).toBe('compact');
    pressAndLift();
    expect(ghost()).not.toBeNull();
    stub.setArena(arena.width, THRESHOLD + bottomBandSavingsPx(viewport.width) + BAND_HYSTERESIS_PX);
    expect(band()).toBe('full');
    expect(ghost()).toBeNull();
    // p1's seat rect, measured at the lift, still holds this point: the control above sends from here.
    fireEvent.pointerUp(window, { ...PRIMARY, ...RELEASE });
    expectNoArenaIntent(props);
  });
});
