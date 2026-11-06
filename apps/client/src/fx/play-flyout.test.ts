// @vitest-environment happy-dom
/**
 * FX measuring on rendered anchors: L51-09, L51-13, L51-14; controller ruling R6 (L75-08). Card
 * ghosts land on the plate, the log endpoint is the first visible one, and collapsed chrome is no
 * FX endpoint. happy-dom has no layout: each anchor is a detached element with a stubbed rect.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DECK_CARD_FLYOUT_HEIGHT,
  DECK_CARD_FLYOUT_WIDTH,
  tokenFlyoutPovSelector,
  tokenFlyoutResourceSelector,
  tokenFlyoutSeatSelector,
} from '../ui/fx-anchors';
import {
  measureDeckCardFlyout,
  measureDirectedTokenFlyout,
  measureFeltCenterRect,
  measurePlayCardGhost,
  measureTargetingCue,
  queryActionLogAnchor,
  queryFirstVisible,
  queryPendingFlashAnchor,
  queryPlayerFxAnchor,
} from './play-flyout';
import { tokenFlyoutUsesCardChrome, type DomRectLite } from './table-fx-types';

const anchors: HTMLElement[] = [];
function anchor(attributes: Readonly<Record<string, string>>, rect: DOMRect, parent: HTMLElement = document.body): HTMLElement {
  const element = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  parent.append(element);
  anchors.push(element);
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect);
  return element;
}
const centre = (rect: DomRectLite | null | undefined): readonly number[] =>
  rect === null || rect === undefined ? [] : [rect.left + rect.width / 2, rect.top + rect.height / 2];
/** The plate (landing frame inside), p2's seat with its portrait, and the log ticker. */
function plateSeatAndLog(): HTMLElement {
  const plate = anchor({ 'data-zone': 'pending' }, new DOMRect(100, 300, 120, 122));
  anchor({ 'data-plate-landing': '' }, new DOMRect(134, 310, 52, 74), plate);
  const seat = anchor({ 'data-zone': 'opponent-seat', 'data-player-id': 'p2' }, new DOMRect(10, 10, 76, 92));
  anchor({ 'data-zone': 'opponent-portrait' }, new DOMRect(14, 24, 40, 53), seat);
  anchor({ 'data-zone': 'log-collapsed' }, new DOMRect(0, 60, 400, 44));
  return plate;
}

afterEach(() => {
  for (const element of anchors.splice(0)) element.remove();
  vi.restoreAllMocks();
});

describe('measureTokenFlyout playerId (L51-09 / L51-13)', () => {
  it('scopes opponent resources to the seat and POV to the dock', () => {
    expect(tokenFlyoutResourceSelector('point')).toBe(
      '[data-zone="resources"] [data-resource-kind="point"]',
    );
    expect(tokenFlyoutResourceSelector('life', 'p2')).toBe(
      '[data-zone="opponent-seat"][data-player-id="p2"] [data-resource-kind="life"]',
    );
    expect(tokenFlyoutSeatSelector('p2')).toBe(
      '[data-zone="opponent-seat"][data-player-id="p2"]',
    );
    expect(tokenFlyoutPovSelector('me')).toBe(
      '[data-zone="private-zone"][data-player-id="me"]',
    );
    expect(tokenFlyoutResourceSelector('point')).not.toContain('opponent-seat');
  });

  it('sizes buy/sell card ghosts toward the felt center (L51-13)', () => {
    expect([DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT]).toEqual([48, 72]);
    const plate = plateSeatAndLog();
    const buy = measureDeckCardFlyout('p2', 'verso.png', 'buy');
    expect([centre(buy?.from), centre(buy?.to)]).toEqual([[160, 347], [34, 50.5]]);
    expect([buy?.from.width, buy?.from.height, buy?.to.width, buy?.to.height]).toEqual([48, 72, 48, 72]);
    const sell = measureDeckCardFlyout('p2', 'verso.png', 'sell');
    expect([centre(sell?.from), centre(sell?.to)]).toEqual([[34, 50.5], [160, 347]]);
    plate.remove();
    // With no plate and no felt the log alone is never a ghost target (L51-13).
    expect(measureDeckCardFlyout('p2', 'verso.png', 'buy')).toBeNull();
  });

  it('token chip chrome is asCard-only — width must not promote resource icons (L51-14)', () => {
    expect(tokenFlyoutUsesCardChrome({ asCard: true })).toBe(true);
    expect(tokenFlyoutUsesCardChrome({})).toBe(false);
  });
});

describe('arena FX endpoints (R6, L75-08)', () => {
  it('aims card ghosts at the plate landing, then the plate, then the felt, never the hand band', () => {
    const felt = anchor({ 'data-zone': 'felt' }, new DOMRect(0, 0, 400, 500));
    const plate = anchor({ 'data-zone': 'pending' }, new DOMRect(100, 300, 120, 122), felt);
    const landing = anchor({ 'data-plate-landing': '' }, new DOMRect(134, 310, 52, 74), plate);
    anchor({ 'data-zone': 'card-band' }, new DOMRect(0, 600, 400, 130));
    anchor({ 'data-instance-id': 'atk-1' }, new DOMRect(30, 620, 64, 96));
    expect(centre(measureFeltCenterRect())).toEqual([160, 347]);
    expect(centre(measurePlayCardGhost('me', 'art.png', 'atk-1')?.to)).toEqual([160, 347]);
    vi.spyOn(landing, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 0, 0));
    expect(centre(measureFeltCenterRect())).toEqual([160, 361]);
    plate.remove();
    expect(centre(measureFeltCenterRect())).toEqual([200, 250]);
    felt.remove();
    expect(measureFeltCenterRect()).toBeNull();
  });

  it('a zero-size plate, as the classic table lays out, sends ghosts to the felt (L75-08 m2)', () => {
    const felt = anchor({ 'data-zone': 'felt' }, new DOMRect(0, 0, 400, 500));
    anchor({ 'data-zone': 'pending' }, new DOMRect(0, 0, 0, 0), felt);
    anchor({ 'data-plate-landing': '' }, new DOMRect(0, 0, 0, 0), felt);
    expect(centre(measureFeltCenterRect())).toEqual([200, 250]);
  });

  it('the log endpoint is the first visible of the panel and the toggle (Review Focus 5)', () => {
    const panel = anchor({ 'data-zone': 'action-log-panel' }, new DOMRect(0, 0, 0, 0));
    const toggle = anchor({ 'data-zone': 'log-collapsed' }, new DOMRect(1396, 100, 44, 44));
    expect(queryActionLogAnchor()).toBe(toggle);
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(new DOMRect(1110, 160, 320, 640));
    expect(queryActionLogAnchor()).toBe(panel);
    expect(queryFirstVisible(['[data-zone="nowhere"]'])).toBeNull();
  });

  it('aims a log chip at the visible part of a log taller than the screen, not at the middle of its content (K12, Check 1)', () => {
    plateSeatAndLog();
    // The log sheet's content div at 360x740 in Check 1: 5147 px tall, its top 4422 px above the screen.
    anchor({ 'data-zone': 'action-log-panel' }, new DOMRect(19, -4422, 322, 5147));
    const viewport = { top: window.visualViewport?.offsetTop ?? 0, bottom: (window.visualViewport?.offsetTop ?? 0) + (window.visualViewport?.height ?? window.innerHeight) };
    const chip = measureDirectedTokenFlyout('point', 'log', { playerId: 'p2' });
    const middle = chip === null ? NaN : chip.from.top + chip.from.height / 2;
    // Unclipped, the middle of the content is at -1848 (the chip flew from off-screen).
    expect(middle).toBeGreaterThanOrEqual(viewport.top);
    expect(middle).toBeLessThanOrEqual(viewport.bottom);
  });

  it('flashes a resolution on the first visible element with the effect id, else the plate (A.7.1)', () => {
    // The arrow label comes first in document order, then the plate with its badge.
    const label = anchor({ 'data-pending-id': 'e1' }, new DOMRect(0, 0, 0, 0));
    const plate = anchor({ 'data-zone': 'pending' }, new DOMRect(100, 300, 120, 122));
    const badge = anchor({ 'data-pending-id': 'e1' }, new DOMRect(110, 380, 44, 44), plate);
    expect(queryPendingFlashAnchor('e1')).toBe(badge);
    vi.spyOn(label, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 200, 44, 44));
    expect(queryPendingFlashAnchor('e1')).toBe(label);
    expect(queryPendingFlashAnchor('gone')).toBe(plate);
    vi.spyOn(plate, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 0, 0));
    expect(queryPendingFlashAnchor('gone')).toBe(plate);
  });

  it('collapsed chrome is no FX endpoint: a player with no seat has no anchor and no cue (R6)', () => {
    anchor({ 'data-zone': 'opponents-collapsed' }, new DOMRect(0, 0, 120, 44));
    anchor({ 'data-zone': 'incoming-collapsed' }, new DOMRect(0, 50, 44, 44));
    expect([queryPlayerFxAnchor('p9'), measureTargetingCue('p9', 'me')]).toEqual([null, null]);
  });
});
