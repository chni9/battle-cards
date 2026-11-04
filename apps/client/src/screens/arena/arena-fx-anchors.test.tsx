// @vitest-environment happy-dom
/**
 * The FX anchor contract on the arena: technical spec v7 §6.12, §8.1, §8.3; controller ruling R6;
 * plan Appendix A.7.1 and Review Focus 5; Appendix A `table-fx-layer`, `table-fx-token-chips`,
 * `table-fx-card-ghosts`, `table-fx-threat`, `table-fx-resolution-elim-reward`, `table-banners`
 * (L75-08). happy-dom has no layout: `rectFor` gives each anchor its own box, so every measure
 * names the element it read; any other element reports the arena box.
 */
import type { PlayingStateView } from '@card-battle/shared';
import { within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  measureBuyCardFlyout, measureBuySpecialFlyout, measureDirectedTokenFlyout, measureFeltCenterRect, measurePlayCardGhost,
  measureTargetingCue, measureTokenFlyout, queryActionLogAnchor, queryPendingFlashAnchor, queryPlayerFxAnchor,
} from '../../fx/play-flyout';
import type { DomRectLite } from '../../fx/table-fx-types';
import { renderUi } from '../../test/render';
import { makeCard, makePending, makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen } from './arena-screen';
import { ARENA_TEST_BOXES, expectNoArenaIntent, makeArenaProps, makeArenaView, stubArenaLayout, type ArenaLayoutStub } from './test-view';

const SEAT_P1 = '[data-zone="opponent-seat"][data-player-id="p1"]';
const BOX = {
  p1Portrait: new DOMRect(14, 24, 40, 53), p1Life: new DOMRect(58, 26, 28, 16), p1Seat: new DOMRect(10, 10, 76, 92),
  ownKit: new DOMRect(20, 560, 40, 53), ownPoint: new DOMRect(120, 570, 44, 28), landing: new DOMRect(170, 380, 52, 74),
  atk: new DOMRect(30, 650, 64, 96), hand: new DOMRect(16, 650, 200, 96), specials: new DOMRect(240, 650, 64, 96),
  ticker: new DOMRect(8, 96, 374, 44), toggle: new DOMRect(1396, 100, 44, 44), logPanel: new DOMRect(1110, 160, 320, 640),
} as const;
/** Descendant selectors first: an element takes the first box whose selector it matches. */
const ANCHOR_BOXES: readonly (readonly [string, DOMRect])[] = [
  [`${SEAT_P1} [data-zone="opponent-portrait"]`, BOX.p1Portrait],
  [`${SEAT_P1} [data-resource-kind="life"]`, BOX.p1Life],
  [SEAT_P1, BOX.p1Seat],
  ['[data-zone="private-zone"] [data-zone="kit-portrait"]', BOX.ownKit],
  ['[data-zone="resources"] [data-resource-kind="point"]', BOX.ownPoint],
  ['[data-plate-landing]', BOX.landing],
  ['[data-instance-id="atk-1"]', BOX.atk],
  ['[data-zone="hand"]', BOX.hand],
  ['[data-zone="specials"]', BOX.specials],
  ['[data-arena-region="ticker"] [data-zone="log-collapsed"][aria-haspopup]', BOX.ticker],
  ['[data-zone="log-collapsed"]', BOX.toggle],
  ['[data-zone="action-log-panel"]', BOX.logPanel],
];
const rectFor = (element: Element): DOMRect | undefined =>
  element.hasAttribute('data-stand-in') ? new DOMRect(0, 0, 0, 0) : ANCHOR_BOXES.find(([selector]) => element.matches(selector))?.[1];
/** Index 0 fans a chip 5 px left, scaled 0.4 on arrival (`fannedChip`, fx/play-flyout.ts). */
const FAN = { from: -5, to: -2 } as const;
function expectCentredOn(rect: DomRectLite | null | undefined, box: DOMRect, dx = 0): void {
  if (rect === null || rect === undefined) throw new Error('no rect measured');
  expect(rect.left + rect.width / 2).toBeCloseTo(box.left + box.width / 2 + dx, 6);
  expect(rect.top + rect.height / 2).toBeCloseTo(box.top + box.height / 2, 6);
}
const fxView = (seatCount: number): PlayingStateView => makeArenaView({ seatCount, overrides: {
  self: makeSelf({ points: 10, hand: [makeCard('basic-attack', { instanceId: 'atk-1' })], specialCards: [makeCard('mega-attack', { instanceId: 'mega-1' })] }),
  pendingEffects: [makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' })],
} });
const FX_VIEW: PlayingStateView = fxView(3);

let layout: ArenaLayoutStub | null = null;
afterEach(() => { layout?.restore(); layout = null; });
function one(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`no ${selector}`);
  return found;
}
const region = (name: string): HTMLElement => one(`[data-arena-region="${name}"]`);

describe('FX anchor contract (R6, A.7.1)', () => {
  it.each([
    { label: 'portrait', mode: 'portrait', band: 'full', box: ARENA_TEST_BOXES.phone390, view: FX_VIEW, log: BOX.ticker, logZone: 'log-collapsed' },
    // 8 seats at 360×740 overlap the plate, so the band compacts (L75-13): the strip and the hand shrink, every anchor stays.
    { label: 'portrait with the compact band', mode: 'portrait', band: 'compact', box: ARENA_TEST_BOXES.phone360, view: fxView(8), log: BOX.ticker, logZone: 'log-collapsed' },
    { label: 'landscape-compact', mode: 'landscape-compact', band: 'full', box: ARENA_TEST_BOXES.landscape, view: FX_VIEW, log: BOX.ticker, logZone: 'log-collapsed' },
    { label: 'desktop', mode: 'desktop', band: 'full', box: ARENA_TEST_BOXES.desktop, view: FX_VIEW, log: BOX.logPanel, logZone: 'action-log-panel' },
  ])('resolves every FX endpoint to a rendered arena element in $label', ({ mode, band, box, view, log, logZone }) => {
    layout = stubArenaLayout(box.viewport, box.arena, { rectFor });
    const props = makeArenaProps({ view });
    renderUi(<ArenaScreen {...props} />);
    const main = one('main[data-arena="next"]');
    expect([main.getAttribute('data-layout-mode'), main.getAttribute('data-bottom-band')]).toEqual([mode, band]);
    // Seat: the token-chip anchor, the targeting cue and the elimination beat read it.
    expect(queryPlayerFxAnchor('p1')).toBe(one(SEAT_P1));
    expect(measureTargetingCue('p1', 'me')?.from).toEqual({ left: 10, top: 10, width: 76, height: 92 });
    // POV, its values and its kit portrait; the seat's value and portrait (a Thief steal).
    expect(queryPlayerFxAnchor('me')).toBe(region('self-strip'));
    expectCentredOn(measureDirectedTokenFlyout('life', 'log', { playerId: 'p1' })?.to, BOX.p1Life, FAN.to);
    const gain = measureTokenFlyout('point', 'gain');
    expectCentredOn(gain?.from, log, FAN.from);
    expectCentredOn(gain?.to, BOX.ownPoint, FAN.to);
    const steal = measureDirectedTokenFlyout('point', { playerId: 'p1' }, { playerId: 'me' });
    expectCentredOn(steal?.from, BOX.p1Portrait, FAN.from);
    expectCentredOn(steal?.to, BOX.ownKit, FAN.to);
    // Card ghosts: the hand instance to the plate (48 × 72), buys to the hand and specials groups.
    const ghost = measurePlayCardGhost('me', 'art.png', 'atk-1');
    expectCentredOn(ghost?.from, BOX.atk);
    expectCentredOn(ghost?.to, BOX.landing);
    expect([ghost?.to.width, ghost?.to.height]).toEqual([48, 72]);
    expectCentredOn(measureFeltCenterRect(), BOX.landing);
    expectCentredOn(measureBuyCardFlyout('spy')?.to, BOX.hand);
    expectCentredOn(measureBuySpecialFlyout()?.to, BOX.specials);
    // Resolution flash, log, reward pulse (dock), last fallback (felt).
    expect(queryPendingFlashAnchor('e1')?.getAttribute('data-pending-id')).toBe('e1');
    expect(queryActionLogAnchor()?.getAttribute('data-zone')).toBe(logZone);
    expect(one('[data-zone="dock"]')).toBe(region('dock'));
    expect(one('[data-zone="felt"]')).toBe(region('arena'));
    // The banner host reads no anchor: it sits on the visual viewport box in every mode.
    const banners = one('[data-zone="table-banners"]');
    expect([banners.style.width, banners.style.height]).toEqual([`${String(box.viewport.width)}px`, `${String(box.viewport.height)}px`]);
    expectNoArenaIntent(props);
  });

  it('measures a log chip from the toggle while the desktop panel is collapsed, and from its scrollport once expanded (Review Focus 5)', async () => {
    layout = stubArenaLayout(ARENA_TEST_BOXES.desktop.viewport, ARENA_TEST_BOXES.desktop.arena, { rectFor });
    const { user } = renderUi(<ArenaScreen {...makeArenaProps({ view: FX_VIEW })} />);
    const toggle = within(region('ticker')).getByRole('button', { name: 'Action log' });
    await user.click(toggle);
    // A mounted, zero-size log list (as a depth-hidden log sheet leaves) must not swallow the toggle.
    const standIn = document.createElement('div');
    standIn.setAttribute('data-zone', 'action-log-panel');
    standIn.setAttribute('data-stand-in', '');
    document.body.append(standIn);
    expect(queryActionLogAnchor()).toBe(toggle);
    expectCentredOn(measureTokenFlyout('point', 'gain')?.from, BOX.toggle, FAN.from);
    await user.click(toggle);
    expect(queryActionLogAnchor()).toBe(one('[data-arena-region="ticker"] [data-zone="action-log-panel"]'));
    expectCentredOn(measureTokenFlyout('point', 'gain')?.from, BOX.logPanel, FAN.from);
    standIn.remove();
  });
});
