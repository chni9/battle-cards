/**
 * Arena sheets reducer — Lot 74 plan Appendix A.5; technical spec v7 §6.7 (read-only sheets
 * stack, Esc closes only the top one, Q49) and §6.6.4 (closing sends nothing).
 */
import { describe, expect, it } from 'vitest';

import { inPlayThumbs } from '../../view-model/card-actions';
import { makeCard, makeSelf } from '../../view-model/test-fixtures';
import {
  arenaSheetEntries, arenaSheetKey, closeAllArenaSheets, closeArenaSheet, closeStaleSeatSheets, EMPTY_ARENA_SHEETS, endTargeting,
  MAX_CLOSING_SHEETS, openArenaSheet, openSeatId, startTargeting, type ArenaSheet, type TargetingState,
} from './arena-sheets';
import { makeArenaView } from './test-view';

const SPY: ArenaSheet = { kind: 'card', source: { kind: 'hand', instance: makeCard('spy') } };
/** A fresh object with the same key as SPY: the reducer matches by key, not by reference. */
const SPY_AGAIN: ArenaSheet = { kind: 'card', source: { kind: 'hand', instance: makeCard('spy') } };
const QUEUE: ArenaSheet = { kind: 'card', source: { kind: 'queue', effectId: 'e9', cardId: 'basic-attack', isUpgraded: false } };
const KIT: ArenaSheet = { kind: 'kit', kitId: 'tactician' };

describe('arena sheets (Appendix A.5, spec v7 §6.7)', () => {
  it('starts with no open and no closing sheet', () => {
    expect(EMPTY_ARENA_SHEETS).toEqual({ open: [], closing: [], targeting: null });
    expect(MAX_CLOSING_SHEETS).toBe(2);
  });

  it('keys a card sheet by its face id and a kit sheet by its kit', () => {
    const shield = inPlayThumbs(makeArenaView({ overrides: { self: makeSelf({ shield: 4 }) } }), 'me')[0];
    if (shield === undefined) {
      throw new Error('no shield thumb');
    }
    expect([
      arenaSheetKey(SPY),
      arenaSheetKey(QUEUE),
      arenaSheetKey({ kind: 'card', source: { kind: 'log', cardId: 'spy', isUpgraded: false } }),
      arenaSheetKey({ kind: 'card', source: { kind: 'in-play', thumb: shield } }),
      arenaSheetKey(KIT),
    ]).toEqual(['card:spy-1', 'card:queue-e9', 'card:log-spy-base', 'card:active-shield', 'kit:tactician']);
  });

  it('opens sheets oldest first and moves a sheet that is already open to the top', () => {
    const state = [SPY, KIT, SPY_AGAIN].reduce(openArenaSheet, EMPTY_ARENA_SHEETS);
    expect(state.open.map(arenaSheetKey)).toEqual(['kit:tactician', 'card:spy-1']);
  });

  it('returns the same state when the top sheet opens again', () => {
    const once = openArenaSheet(EMPTY_ARENA_SHEETS, KIT);
    expect(openArenaSheet(once, { kind: 'kit', kitId: 'tactician' })).toBe(once);
  });

  it('moves a closed sheet to closing for its exit, keeping the last two', () => {
    let state = [SPY, QUEUE, KIT].reduce(openArenaSheet, EMPTY_ARENA_SHEETS);
    state = closeArenaSheet(state, KIT);
    expect([state.open.map(arenaSheetKey), state.closing.map(arenaSheetKey)])
      .toEqual([['card:spy-1', 'card:queue-e9'], ['kit:tactician']]);
    state = closeArenaSheet(closeArenaSheet(state, QUEUE), SPY);
    expect([state.open, state.closing.map(arenaSheetKey)]).toEqual([[], ['card:queue-e9', 'card:spy-1']]);
  });

  it('takes a reopened sheet out of closing', () => {
    const reopened = openArenaSheet(closeArenaSheet(openArenaSheet(EMPTY_ARENA_SHEETS, KIT), KIT), KIT);
    expect([reopened.open.map(arenaSheetKey), reopened.closing]).toEqual([['kit:tactician'], []]);
  });

  it('ignores closing a sheet that is not open', () => {
    const state = openArenaSheet(EMPTY_ARENA_SHEETS, SPY);
    expect(closeArenaSheet(state, KIT)).toBe(state);
  });

  it('lists closing sheets, then open sheets, with their keys and open flags', () => {
    const state = closeArenaSheet([SPY, KIT].reduce(openArenaSheet, EMPTY_ARENA_SHEETS), SPY);
    expect(arenaSheetEntries(state)).toEqual([
      { sheet: SPY, key: 'card:spy-1', open: false },
      { sheet: KIT, key: 'kit:tactician', open: true },
    ]);
  });
});

describe('seat sheets (L74-05)', () => {
  it('keys a seat sheet by its player', () => {
    expect(arenaSheetKey({ kind: 'seat', playerId: 'p1' })).toBe('seat:p1');
  });

  it('opening an open seat again moves it to the top, never a copy', () => {
    let state = openArenaSheet(EMPTY_ARENA_SHEETS, { kind: 'seat', playerId: 'p1' });
    state = openArenaSheet(state, { kind: 'kit', kitId: 'tactician' });
    state = openArenaSheet(state, { kind: 'seat', playerId: 'p1' });
    expect(state.open).toEqual([{ kind: 'kit', kitId: 'tactician' }, { kind: 'seat', playerId: 'p1' }]);
  });

  it('openSeatId is the newest open seat, even under a card sheet, and null without one', () => {
    expect(openSeatId(EMPTY_ARENA_SHEETS)).toBeNull();
    let state = openArenaSheet(EMPTY_ARENA_SHEETS, { kind: 'seat', playerId: 'p1' });
    state = openArenaSheet(state, { kind: 'seat', playerId: 'p2' });
    state = openArenaSheet(state, { kind: 'kit', kitId: 'tactician' });
    expect(openSeatId(state)).toBe('p2');
    expect(openSeatId(closeArenaSheet(closeArenaSheet(state, { kind: 'seat', playerId: 'p2' }), { kind: 'seat', playerId: 'p1' }))).toBeNull();
  });

  it('closes seat sheets whose player is no longer an opponent, and returns the same state otherwise (final review Minor 15)', () => {
    const seatMe: ArenaSheet = { kind: 'seat', playerId: 'me' };
    const seatP1: ArenaSheet = { kind: 'seat', playerId: 'p1' };
    const state = [seatMe, KIT, seatP1].reduce((current, sheet) => openArenaSheet(current, sheet), EMPTY_ARENA_SHEETS);
    expect(closeStaleSeatSheets(state, ['me', 'p1', 'p2'])).toBe(state);
    const next = closeStaleSeatSheets(state, ['p1', 'p2']);
    expect(next.open.map(arenaSheetKey)).toEqual(['kit:tactician', 'seat:p1']);
    expect(next.closing.map(arenaSheetKey)).toEqual(['seat:me']);
    expect(openSeatId(next)).toBe('p1');
  });
});

describe('targeting (L74-10, §6.6.2)', () => {
  const card = (instanceId: string): ArenaSheet => ({ kind: 'card', source: { kind: 'hand', instance: makeCard('spy', { instanceId }) } });
  const kit: ArenaSheet = { kind: 'kit', kitId: 'tactician' };
  const targetingOf = (sheet: ArenaSheet): TargetingState => ({ sheetKey: arenaSheetKey(sheet), instanceId: 'spy-1', seatIds: ['p1'] });

  it('keeps only the targeted card sheet open, closes the others through their exit, and records the target set', () => {
    const spy = card('spy-1');
    const state = openArenaSheet(openArenaSheet(EMPTY_ARENA_SHEETS, kit), spy);
    expect(startTargeting(state, targetingOf(spy))).toEqual({ open: [spy], closing: [kit], targeting: targetingOf(spy) });
  });

  it('ignores a target request for a sheet that is not open', () => {
    const state = openArenaSheet(EMPTY_ARENA_SHEETS, kit);
    expect(startTargeting(state, targetingOf(card('spy-1')))).toBe(state);
  });

  it('ends targeting by closing the targeted sheet', () => {
    const spy = card('spy-1');
    const state = startTargeting(openArenaSheet(EMPTY_ARENA_SHEETS, spy), targetingOf(spy));
    expect(endTargeting(state)).toEqual({ open: [], closing: [spy], targeting: null });
  });

  it('returns the same state when nothing is targeted', () => {
    const state = openArenaSheet(EMPTY_ARENA_SHEETS, kit);
    expect(endTargeting(state)).toBe(state);
  });

  it('opening any sheet ends targeting first: targeting is exclusive', () => {
    const spy = card('spy-1');
    const state = startTargeting(openArenaSheet(EMPTY_ARENA_SHEETS, spy), targetingOf(spy));
    expect(openArenaSheet(state, kit)).toEqual({ open: [kit], closing: [spy], targeting: null });
  });

  it('closing the targeted sheet clears targeting', () => {
    const spy = card('spy-1');
    const state = startTargeting(openArenaSheet(EMPTY_ARENA_SHEETS, spy), targetingOf(spy));
    expect(closeArenaSheet(state, spy)).toEqual({ open: [], closing: [spy], targeting: null });
  });

  it('closes every sheet through its exit and ends targeting, and returns the same state when nothing is open (a new POV, L74-23)', () => {
    const spy = card('spy-1');
    const seat: ArenaSheet = { kind: 'seat', playerId: 'p1' };
    expect(closeAllArenaSheets(openArenaSheet(openArenaSheet(EMPTY_ARENA_SHEETS, seat), kit))).toEqual({ open: [], closing: [seat, kit], targeting: null });
    expect(closeAllArenaSheets(startTargeting(openArenaSheet(EMPTY_ARENA_SHEETS, spy), targetingOf(spy)))).toEqual({ open: [], closing: [spy], targeting: null });
    const closed = closeArenaSheet(openArenaSheet(EMPTY_ARENA_SHEETS, kit), kit);
    expect(closeAllArenaSheets(closed)).toBe(closed);
  });
});
