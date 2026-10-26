// @vitest-environment happy-dom
/** TableBannerHost — L72-18 (spec v7 §6.12, §8.1, §8.3; L51-06, L63-03, L67-01). */
import { act, screen } from '@testing-library/react';
import { StrictMode, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActionLogEntryView, PendingEffectView, SentenceAnnouncementLogEntry } from '@card-battle/shared';

import { renderUi } from '../../test/render';
import { TABLE_BANNER_MS as MS } from '../../view-model/table-banner';
import { Z_INDEX } from '../layers';
import { V7_COLORS, v7SeatColor } from '../palette';
import { TableBannerHost, type TableBannerHostProps } from './table-banner-host';

const TURN = 'Your turn', ATK = 'You are being attacked', DEAD = 'You are dead', WON = 'You won!';
const S3 = 'Sentence in 3 turns!', S2 = '2 turns before Sentence!';
const nick = (id: string): string => (id === 'b' ? 'Bob' : 'Alice');
function host(o: Partial<TableBannerHostProps> = {}): ReactElement {
  return <TableBannerHost isMyTurn={false} isEliminated={false} youWon={false} pendingEffects={[]}
    sentenceAnnouncements={[]} actionLog={[]} nicknameOf={nick} you="me" {...o} />;
}
const atk = (id: string): PendingEffectView => ({ id, cardId: 'basic-attack', isUpgraded: false,
  sourcePlayerId: 'opp', targetPlayerId: 'me', queuedAt: 1, damageMultiplier: 1, redirectedBy: null });
const countdown = (remainingOwnerTurns: number, turnSequence: number): SentenceAnnouncementLogEntry =>
  ({ kind: 'sentenceCountdown', sourcePlayerId: 'a', remainingOwnerTurns, turnSequence });
const play = countdown(3, 1), tick = countdown(2, 3);
const bust = (actorPlayerId: string, turnSequence: number): ActionLogEntryView =>
  ({ kind: 'actionPlayed', actorPlayerId, action: 'draw', turnSequence, drawBust: true });
function advance(ms: number): void { act(() => { vi.advanceTimersByTime(ms); }); }
const shown = (text: string): HTMLElement | null => screen.queryByText(text);
function on(text: string): void { expect(shown(text)).not.toBeNull(); }
function off(text: string): void { expect(shown(text)).toBeNull(); }
function none(v: { container: HTMLElement }): void { expect(v.container.querySelector('[data-banner]')).toBeNull(); }
/** Normalizes a hex the way the DOM reports inline colors. */
function css(hex: string): string { const p = document.createElement('p'); p.style.backgroundColor = hex; return p.style.backgroundColor; }
function fadeOnly(el: HTMLElement): void { expect(el.getAttribute('data-motion')).toBe('reduced'); expect(el.style.transform).toBe(''); }

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('TableBannerHost (L72-18)', () => {
  it('plays queued cues in order, each for TABLE_BANNER_MS', () => {
    const view = renderUi(host());
    none(view);
    view.rerender(host({ isMyTurn: true, pendingEffects: [atk('a1')] }));
    on(ATK); off(TURN);
    advance(MS - 1); on(ATK); off(TURN);
    advance(1); off(ATK); on(TURN);
    advance(MS); none(view);
  });

  it('does not extend the showing cue when another is queued behind it', () => {
    const view = renderUi(host({ isMyTurn: true }));
    on(TURN);
    advance(800);
    view.rerender(host({ isMyTurn: true, pendingEffects: [atk('a1')] }));
    on(TURN); off(ATK);
    advance(MS - 800 - 1); on(TURN);
    advance(1); off(TURN); on(ATK);
    advance(MS - 1); on(ATK);
    advance(1); off(ATK);
  });

  it('seeds You won! on first mount and never You are dead', () => {
    renderUi(host({ youWon: true }));
    expect(shown(WON)?.getAttribute('data-banner')).toBe('won');
    off(DEAD);
  });

  it('seeds You are dead on first mount', () => {
    renderUi(host({ isEliminated: true }));
    expect(shown(DEAD)?.getAttribute('data-banner')).toBe('dead');
    off(WON);
  });

  it('seeds Your turn on first mount in a polite, click-through status above sheets', () => {
    renderUi(host({ isMyTurn: true }));
    const banner = screen.getByText(TURN);
    expect(banner.getAttribute('data-banner')).toBe('turn');
    const region = banner.closest('[role="status"]');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.parentElement?.className).toContain('pointer-events-none');
    expect(region?.parentElement?.style.zIndex).toBe(String(Z_INDEX.banner));
  });

  it('replays no log history on first mount', () => {
    const view = renderUi(host({ pendingEffects: [atk('a0')], sentenceAnnouncements: [play], actionLog: [bust('me', 2)] }));
    none(view);
    advance(MS);
    none(view);
  });

  it('announces Sentence lines assertively, one at a time, even to an eliminated POV', () => {
    const view = renderUi(host({ isEliminated: true }));
    view.rerender(host({ isEliminated: true, sentenceAnnouncements: [play] }));
    expect(screen.getByText(S3).getAttribute('data-banner')).toBe('sentence');
    expect(screen.getByText(S3).closest('[role="status"]')?.getAttribute('aria-live')).toBe('assertive');
    advance(400);
    view.rerender(host({ isEliminated: true, sentenceAnnouncements: [play, tick] }));
    off(S2);
    advance(MS - 400);
    off(S3);
    expect(screen.getByText(S2).getAttribute('data-banner')).toBe('sentence');
  });

  it("shows the wipe line only for the POV's own bust, once", () => {
    const view = renderUi(host());
    const wipe = (): Element | null => view.container.querySelector('[data-banner="wipe"]');
    view.rerender(host({ actionLog: [bust('opp', 4)] }));
    expect(wipe()).toBeNull();
    view.rerender(host({ actionLog: [bust('opp', 4), bust('me', 5)] }));
    expect(wipe()?.textContent).toBe('You gambled too much and lost everything');
    expect(wipe()?.closest('[role="status"]')?.getAttribute('aria-live')).toBe('assertive');
    advance(MS);
    view.rerender(host({ actionLog: [bust('opp', 4), bust('me', 5)] }));
    expect(wipe()).toBeNull();
  });

  it('colors Your turn with the POV seat hue and the attack cue with --threat-attack', () => {
    const seat = v7SeatColor(2);
    const view = renderUi(host({ isMyTurn: true, seatColor: seat }));
    expect(screen.getByText(TURN).style.backgroundColor).toBe(css(seat));
    view.rerender(host({ isMyTurn: true, seatColor: seat, pendingEffects: [atk('a1')] }));
    advance(MS);
    expect(screen.getByText(ATK).style.backgroundColor).toBe(css(V7_COLORS['threat-attack']));
  });

  it('defaults the turn hue to --cta', () => {
    renderUi(host({ isMyTurn: true }));
    expect(screen.getByText(TURN).style.backgroundColor).toBe(css(V7_COLORS.cta));
  });

  it('reduced motion renders fades only, with no slam transform', () => {
    const view = renderUi(host(), { reducedMotion: true });
    view.rerender(host({ isMyTurn: true, pendingEffects: [atk('a1')], sentenceAnnouncements: [play] }));
    fadeOnly(screen.getByText(ATK));
    fadeOnly(screen.getByText(S3));
    advance(MS);
    fadeOnly(screen.getByText(TURN));
  });

  it('full motion keeps the slam transform (guard for the reduced case)', () => {
    const view = renderUi(host());
    view.rerender(host({ pendingEffects: [atk('a1')], sentenceAnnouncements: [play] }));
    for (const text of [ATK, S3]) {
      expect(screen.getByText(text).getAttribute('data-motion')).toBe('full');
      expect(screen.getByText(text).style.transform).not.toBe('');
    }
  });

  it('keeps one live region per lane mounted and swaps only its content', () => {
    const view = renderUi(host());
    const regions = (): Element[] => [...view.container.querySelectorAll('[role="status"]')];
    const mounted = regions();
    expect(mounted.map((region) => region.getAttribute('aria-live'))).toEqual(['polite', 'assertive', 'assertive']);
    expect(mounted.map((region) => region.textContent)).toEqual(['', '', '']);
    view.rerender(host({ isMyTurn: true, sentenceAnnouncements: [play], actionLog: [bust('me', 5)] }));
    expect(regions()).toEqual(mounted);
    expect(mounted.map((region) => region.textContent)).toEqual([TURN, S3, 'You gambled too much and lost everything']);
    advance(MS);
    expect(regions()).toEqual(mounted);
    expect(mounted.map((region) => region.textContent)).toEqual(['', '', '']);
  });

  it('keeps the showing banner node across a rerender with the same state, so it is announced once', () => {
    const view = renderUi(host({ isMyTurn: true, pendingEffects: [atk('a0')] }));
    const banner = screen.getByText(TURN);
    view.rerender(host({ isMyTurn: true, pendingEffects: [atk('a0')] }));
    expect(screen.getByText(TURN)).toBe(banner);
    expect(screen.getAllByText(TURN)).toHaveLength(1);
    off(ATK);
  });
});

describe('TableBannerHost under StrictMode (L51-06)', () => {
  it('shows the first-paint You won! once, for TABLE_BANNER_MS', () => {
    renderUi(<StrictMode>{host({ youWon: true })}</StrictMode>);
    expect(screen.getAllByText(WON)).toHaveLength(1);
    advance(MS - 1);
    expect(screen.getAllByText(WON)).toHaveLength(1);
    advance(1); off(WON);
    advance(MS); off(WON);
  });

  it('shows the first-paint You are dead once and never You won!', () => {
    renderUi(<StrictMode>{host({ isEliminated: true })}</StrictMode>);
    expect(screen.getAllByText(DEAD)).toHaveLength(1);
    off(WON);
    advance(MS - 1);
    expect(screen.getAllByText(DEAD)).toHaveLength(1);
    advance(1); off(DEAD);
  });
});
