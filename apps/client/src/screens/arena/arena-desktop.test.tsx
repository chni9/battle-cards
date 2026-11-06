// @vitest-environment happy-dom
/**
 * The arena desktop layout and the layout-mode root: technical spec v7 §6.1, §6.4, §6.9, §7.7;
 * controller rulings R1 (thresholds), R2 (the portrait test window), R3 (desktop); plan Appendix
 * A.2–A.4 and A.10 (L75-02). It also pins `stubArenaLayout`: a node test cannot render a mode flip.
 */
import type { ActionLogEntryView, PlayingStateView } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { SEAT_BOX, type LayoutBox } from '../../view-model/seat-layout';
import { seats } from '../../view-model/seats';
import { makeCard, makeSelf } from '../../view-model/test-fixtures';
import { ARENA_REGIONS } from './arena-regions';
import { ArenaScreen } from './arena-screen';
import { ARENA_TEST_BOXES, expectNoArenaIntent, makeArenaProps, makeArenaView, stubArenaLayout, type ArenaLayoutStub } from './test-view';

const P1_DRAWS: ActionLogEntryView = { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'draw', turnSequence: 1 };
const deskView = (seatCount = 4): PlayingStateView =>
  makeArenaView({ seatCount, overrides: { self: makeSelf({ points: 10, hand: [makeCard('basic-attack', { instanceId: 'atk-1' })] }), actionLog: [P1_DRAWS] } });

let layout: ArenaLayoutStub | null = null;
afterEach(() => { layout?.restore(); layout = null; });

function setupAt(box: LayoutBox, view: PlayingStateView = deskView()) {
  layout?.restore(); // a second setup in one test replaces the first stub, never stacks on it
  const stub = stubArenaLayout(box.viewport, box.arena);
  layout = stub;
  const props = makeArenaProps({ view });
  return { stub, props, ...renderUi(<ArenaScreen {...props} />) };
}
function one(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`no ${selector}`);
  return found;
}
const main = (): HTMLElement => one('main[data-arena="next"]');
const region = (name: string): HTMLElement => one(`[data-arena-region="${name}"]`);
const rows = (): (string | null)[] => ARENA_REGIONS.map((name) => region(name).getAttribute('data-arena-row'));
const logToggle = (): HTMLElement => within(region('ticker')).getByRole('button', { name: 'Action log' });

describe('desktop layout (§6.4, R3)', () => {
  it.each([
    { label: 'the ellipse', box: ARENA_TEST_BOXES.desktop, kind: 'arc', seatBox: SEAT_BOX.desktop },
    // A 120 px arena is too short for any desktop box: the seats shrink to the portrait floor (designer 2026-11-06, S1).
    { label: 'the grid seats() falls back to', box: { viewport: ARENA_TEST_BOXES.desktop.viewport, arena: { width: 1000, height: 120 } }, kind: 'grid', seatBox: SEAT_BOX.portrait },
  ])('1440×900 renders desktop: 7 seats on $label at the desktop box, the log column, the dock in the hand row', ({ box, kind, seatBox }) => {
    const view = deskView(8);
    const { props } = setupAt(box, view);
    expect(main().getAttribute('data-layout-mode')).toBe('desktop');
    const opponents = one('[data-zone="opponents"]');
    expect([opponents.getAttribute('data-seat-layout'), seats(view, box).layout.kind]).toEqual([kind, kind]);
    const drawn = [...opponents.querySelectorAll<HTMLElement>('[data-zone="opponent-seat"]')];
    expect(drawn.map((seat) => [seat.getAttribute('data-seat-size'), seat.style.width, seat.style.height]))
      .toEqual(Array.from({ length: 7 }, () => ['desktop', `${String(seatBox.width)}px`, `${String(seatBox.height)}px`]));
    expect(Array.from(main().querySelectorAll('[data-arena-region]'), (node) => node.getAttribute('data-arena-region'))).toEqual([...ARENA_REGIONS]);
    expect(rows()).toEqual(['top', 'side', 'arena', 'strip', 'hand', 'hand']);
    expect([logToggle().getAttribute('data-zone'), logToggle().getAttribute('aria-expanded')]).toEqual(['log-collapsed', 'true']);
    expect(one('[data-zone="action-log-panel"] [data-log-line="0"]').textContent).toBe('p1 draws');
    expectNoArenaIntent(props);
  });

  it('1024×600: the seats are drawn at the shrunk layout box, not at 120×136, and none is cropped by the arena (S1)', () => {
    const view = deskView(4);
    setupAt(ARENA_TEST_BOXES.desktopShort, view);
    const box = seats(view, ARENA_TEST_BOXES.desktopShort).layout.box;
    if (box === undefined) throw new Error('a desktop layout carries its seat box');
    expect(box.width).toBeLessThan(SEAT_BOX.desktop.width);
    const drawn = [...one('[data-zone="opponents"]').querySelectorAll<HTMLElement>('[data-zone="opponent-seat"]')];
    expect(drawn.map((seat) => [seat.style.width, seat.style.height])).toEqual(
      Array.from({ length: 3 }, () => [`${String(box.width)}px`, `${String(box.height)}px`]),
    );
    expect(drawn.every((seat) => Number.parseFloat(seat.style.top) + box.height <= ARENA_TEST_BOXES.desktopShort.arena.height + 1e-6)).toBe(true);
  });

  it('the log panel toggles closed and open, and its toggle stays rendered; nothing is sent', async () => {
    const { user, props } = setupAt(ARENA_TEST_BOXES.desktop);
    await user.click(logToggle());
    expect([logToggle().getAttribute('aria-expanded'), document.querySelector('[data-zone="action-log-panel"]')]).toEqual(['false', null]);
    await user.click(logToggle());
    expect(logToggle().getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('[data-zone="action-log-panel"]')).not.toBeNull();
    expectNoArenaIntent(props);
  });

  it('Menu → Action log expands a collapsed panel on desktop and opens no sheet', async () => {
    const { user, props } = setupAt(ARENA_TEST_BOXES.desktop);
    await user.click(logToggle());
    await user.click(within(region('top-bar')).getByRole('button', { name: 'Menu' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('button', { name: 'Action log' }));
    expect([logToggle().getAttribute('aria-expanded'), screen.queryByRole('dialog', { name: 'Action log' })]).toEqual(['true', null]);
    expectNoArenaIntent(props);
  });

  it.each<{ label: string; open: (user: UserEvent) => Promise<void>; dialog: string; desktop: 'center' | 'bottom' }>([
    { label: 'the card sheet', open: (user) => user.click(within(region('hand')).getByRole('button', { name: 'Basic attack, 1 damage' })), dialog: 'Basic attack', desktop: 'center' },
    { label: 'the seat sheet', open: (user) => user.click(within(region('arena')).getByRole('button', { name: 'p1' })), dialog: 'p1', desktop: 'center' },
    { label: 'the Shop', open: (user) => user.click(within(region('dock')).getByRole('button', { name: 'Shop' })), dialog: 'Shop', desktop: 'center' },
    { label: 'the chat sheet', open: (user) => user.click(within(region('top-bar')).getByRole('button', { name: /^Chat/ })), dialog: 'Chat', desktop: 'bottom' },
  ])('$label is a $desktop sheet on desktop and a bottom sheet on a portrait phone (§6.4, §7.7)', async ({ open, dialog, desktop }) => {
    const first = setupAt(ARENA_TEST_BOXES.desktop);
    await open(first.user);
    expect(screen.getByRole('dialog', { name: dialog }).getAttribute('data-sheet-placement')).toBe(desktop);
    first.unmount();
    const phone = setupAt(ARENA_TEST_BOXES.phone390);
    await open(phone.user);
    expect(screen.getByRole('dialog', { name: dialog }).getAttribute('data-sheet-placement')).toBe('bottom');
    expectNoArenaIntent(phone.props);
  });

  it('a log sheet opened in portrait stays open when the window turns desktop, beside the expanded panel (A.4.1)', async () => {
    const { user, stub } = setupAt(ARENA_TEST_BOXES.phone390);
    await user.click(within(region('ticker')).getByRole('button', { name: /^Action log/ }));
    stub.setViewport(1440, 900);
    expect(main().getAttribute('data-layout-mode')).toBe('desktop');
    expect(screen.getByRole('dialog', { name: 'Action log' })).toBeTruthy();
    expect(logToggle().getAttribute('aria-expanded')).toBe('true');
  });

  it('a 768×1024 tablet renders portrait: one column with the ticker row and seats at the portrait box (R1)', () => {
    setupAt(ARENA_TEST_BOXES.tablet);
    expect(main().getAttribute('data-layout-mode')).toBe('portrait');
    expect(rows()).toEqual(['top', 'ticker', 'arena', 'strip', 'hand', 'dock']);
    expect(within(region('ticker')).getByRole('button', { name: /^Action log/ }).getAttribute('aria-haspopup')).toBe('dialog');
    expect(one('[data-zone="opponent-seat"]').getAttribute('data-seat-size')).toBe('portrait');
  });
});

describe('layout mode root (R1, R2, A.2)', () => {
  it.each([
    [1440, 900, 'desktop'], [1024, 600, 'desktop'],
    [768, 1024, 'portrait'], [360, 740, 'portrait'], [375, 812, 'portrait'], [390, 844, 'portrait'],
    [844, 390, 'landscape-compact'], [667, 375, 'landscape-compact'], [740, 360, 'landscape-compact'],
  ] as const)('a %i×%i visible box renders %s', (width, height, mode) => {
    setupAt({ viewport: { width, height }, arena: { width: Math.min(width, 1000), height: 200 } });
    expect(main().getAttribute('data-layout-mode')).toBe(mode);
  });

  it('stubArenaLayout flips data-layout-mode live, and every region keeps its element (A.3, A.10)', () => {
    const { stub } = setupAt(ARENA_TEST_BOXES.phone390);
    const before = ARENA_REGIONS.map(region);
    expect(main().getAttribute('data-layout-mode')).toBe('portrait');
    stub.setViewport(1440, 900);
    expect(main().getAttribute('data-layout-mode')).toBe('desktop');
    stub.setViewport(844, 390);
    expect(main().getAttribute('data-layout-mode')).toBe('landscape-compact');
    expect(ARENA_REGIONS.map(region).every((element, index) => element === before[index])).toBe(true);
  });

  it('without a stub the window is a 390×844 portrait phone with an unmeasured arena (R2)', () => {
    renderUi(<ArenaScreen {...makeArenaProps()} />);
    expect([window.innerWidth, window.innerHeight]).toEqual([390, 844]);
    expect([main().getAttribute('data-layout-mode'), one('[data-zone="opponents"]').getAttribute('data-seat-layout')]).toEqual(['portrait', 'grid']);
  });
});
