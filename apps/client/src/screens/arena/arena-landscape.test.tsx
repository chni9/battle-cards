// @vitest-environment happy-dom
/**
 * The arena landscape-compact layout: technical spec v7 §5.4, §6.1, §6.4, §14.3 (tutorial and hint
 * anchors on equivalent elements); controller ruling R4; plan Appendix A.3, A.5 (L75-03).
 */
import type { ActionLogEntryView, PlayingStateView } from '@card-battle/shared';
import { within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { visibleText } from '../../test/glyph-queries';
import { renderUi } from '../../test/render';
import { heightBoundHandCardWidthPx } from '../../ui/card/hand-card-size';
import { SEAT_BOX, seatOrder, type LayoutBox } from '../../view-model/seat-layout';
import { makeCard, makePlayer, makeSelf } from '../../view-model/test-fixtures';
import { ARENA_REGIONS } from './arena-regions';
import { ArenaScreen } from './arena-screen';
import { ARENA_TEST_BOXES, expectNoArenaIntent, makeArenaProps, makeArenaView, stubArenaLayout, type ArenaLayoutStub } from './test-view';

let layout: ArenaLayoutStub | null = null;
afterEach(() => { layout?.restore(); layout = null; });
function setupAt(box: LayoutBox, view: PlayingStateView) {
  layout = stubArenaLayout(box.viewport, box.arena);
  const props = makeArenaProps({ view });
  return { props, ...renderUi(<ArenaScreen {...props} />) };
}
function one(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`no ${selector}`);
  return found;
}
const main = (): HTMLElement => one('main[data-arena="next"]');
const region = (name: string): HTMLElement => one(`[data-arena-region="${name}"]`);
const rows = (): (string | null)[] => ARENA_REGIONS.map((name) => region(name).getAttribute('data-arena-row'));

describe('landscape-compact (§6.4, R4)', () => {
  it.each([
    { label: '844×390', box: ARENA_TEST_BOXES.landscape },
    { label: '667×375', box: ARENA_TEST_BOXES.landscapeSmall },
  ])('$label: 8 seats in the band in turn order; the compact strip, the hand and the dock share one row', ({ box }) => {
    const view = makeArenaView({ seatCount: 8 });
    const { props } = setupAt(box, view);
    expect(main().getAttribute('data-layout-mode')).toBe('landscape-compact');
    const band = one('[data-zone="opponents"]');
    expect(band.getAttribute('data-seat-layout')).toBe('band');
    const drawn = [...band.querySelectorAll<HTMLElement>('[data-zone="opponent-seat"]')];
    expect(drawn.map((seat) => seat.getAttribute('data-player-id'))).toEqual(seatOrder(view));
    expect(drawn.every((seat) => seat.getAttribute('data-seat-size') === 'landscape-compact'
      && seat.style.height === `${String(SEAT_BOX['landscape-compact'].height)}px`)).toBe(true);
    expect(rows()).toEqual(['top', 'top', 'arena', 'hand', 'hand', 'hand']);
    expect(one('[data-self-strip]').getAttribute('data-self-strip')).toBe('compact');
    expect(one('[data-hand-fan]').style.getPropertyValue('--hand-card-w')).toBe(`${String(heightBoundHandCardWidthPx(box.viewport.height))}px`);
    expect(within(region('ticker')).getByRole('button', { name: /^Action log/ }).getAttribute('aria-haspopup')).toBe('dialog');
    expectNoArenaIntent(props);
  });

  it('keeps a long log line out of the band columns: the ticker cell has no width of its own and the line truncates in it (L75-02 handoff)', () => {
    const nickname = 'Bartholomew-the-Magnific'; // 24 characters, the longest nickname
    const draws: ActionLogEntryView = { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'draw', turnSequence: 1 };
    const { props } = setupAt(ARENA_TEST_BOXES.landscapeSmall, makeArenaView({
      overrides: { actionLog: [draws], players: [makePlayer('me', { isYou: true }), makePlayer('p1', { nickname }), makePlayer('p2')] },
    }));
    const cell = region('ticker');
    expect([cell.classList.contains('w-0'), cell.classList.contains('min-w-full')]).toEqual([true, true]);
    const ticker = within(cell).getByRole('button', { name: /^Action log/ });
    expect(ticker.classList.contains('min-w-0')).toBe(true);
    expect(ticker.querySelector('.truncate')?.textContent).toBe(`${nickname} draws`);
    expectNoArenaIntent(props);
  });

  it('a 360×740 phone stays portrait, with the full strip and the ticker row', () => {
    setupAt(ARENA_TEST_BOXES.phone360, makeArenaView());
    expect(main().getAttribute('data-layout-mode')).toBe('portrait');
    expect(rows()).toEqual(['top', 'ticker', 'arena', 'strip', 'hand', 'dock']);
    expect(one('[data-self-strip]').getAttribute('data-self-strip')).toBe('full');
    expect(one('[data-zone="opponents"]').getAttribute('data-seat-layout')).not.toBe('band');
  });

  it.each([
    { mode: 'portrait', box: ARENA_TEST_BOXES.phone390, strip: 'full' },
    { mode: 'landscape-compact', box: ARENA_TEST_BOXES.landscape, strip: 'compact' },
    { mode: 'desktop', box: ARENA_TEST_BOXES.desktop, strip: 'full' },
  ])('keeps every first-game hint anchor and the tutorial anchors on arena elements in $mode (§14.3, S5)', ({ mode, box, strip }) => {
    setupAt(box, makeArenaView({ overrides: { self: makeSelf({ points: 10, hand: [makeCard('spy')] }) } }));
    expect(main().getAttribute('data-layout-mode')).toBe(mode);
    const anchors = new Set(Array.from(document.querySelectorAll('[data-hint-anchor]'), (node) => node.getAttribute('data-hint-anchor')));
    expect([...anchors]).toEqual(expect.arrayContaining(['your-turn', 'incoming', 'resources', 'hand', 'specials', 'draw', 'shop', 'hidden-kit']));
    // The elements L75-04's tour marks (S5): one each, in its region, in every mode.
    for (const selector of [
      '[data-arena-region="ticker"] [data-zone="log-collapsed"]',
      '[data-arena-region="self-strip"] [data-zone="resources"]',
      '[data-arena-region="self-strip"] [data-zone="kit-portrait"]',
      '[data-arena-region="top-bar"] [data-top-bar="turn"]',
      '[data-arena-region="top-bar"] [data-turn-clock]',
    ]) {
      expect(document.querySelectorAll(selector)).toHaveLength(1);
    }
    expect(within(region('top-bar')).getByRole('button', { name: 'Forfeit' })).toBeTruthy();
    expect(one('[data-self-strip]').getAttribute('data-self-strip')).toBe(strip);
  });
});

describe('the dock under 700 px of landscape width (designer 2026-11-06, S2)', () => {
  const dockOf = (): HTMLElement => one('[data-arena-region="dock"]');
  const duplicator = (): PlayingStateView => makeArenaView({ overrides: { self: makeSelf({ kitId: 'duplicator', points: 20 }) } });

  it('667×375 shows icons only; every control keeps its name, and a disabled one keeps its reason', () => {
    setupAt(ARENA_TEST_BOXES.landscapeSmall, duplicator());
    const dock = dockOf();
    const names = ['Shop', 'Activate duplication'];
    for (const name of names) {
      const button = within(dock).getByRole('button', { name });
      expect([visibleText(button).trim(), button.getAttribute('title')?.startsWith(name), button.querySelector('[data-icon]') !== null]).toEqual(['', true, true]);
    }
    expect(within(dock).getByRole('button', { name: /^Draw, plus / })).toBeTruthy();
    expect(within(dock).getByRole('button', { name: /^Unspy/ })).toBeTruthy();
    expect(dock.querySelector('[data-reason-slot]')).toBeNull();
  });

  it('a disabled icon control says why: its title and its description hold the reason, with no visible line', () => {
    setupAt(ARENA_TEST_BOXES.landscapeSmall, makeArenaView({ overrides: { self: makeSelf({ kitId: 'duplicator', points: 20 }), currentTurnPlayerId: 'p1' } }));
    const button = within(dockOf()).getByRole('button', { name: 'Activate duplication' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    const reason = (button.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
    expect(reason).not.toBe('');
    expect(button.getAttribute('title')).toBe(`Activate duplication. ${reason}`);
    expect(visibleText(dockOf()).includes(reason)).toBe(false);
  });

  it('844×390 keeps the labelled dock', () => {
    setupAt(ARENA_TEST_BOXES.landscape, duplicator());
    const dock = dockOf();
    expect(visibleText(within(dock).getByRole('button', { name: 'Shop' })).trim()).toBe('Shop');
    expect(visibleText(within(dock).getByRole('button', { name: 'Activate duplication' })).trim()).toBe('Activate duplication');
    expect(dock.querySelector('[data-reason-slot]')).not.toBeNull();
  });
});
