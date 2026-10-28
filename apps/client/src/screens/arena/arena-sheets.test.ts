/**
 * Arena sheets reducer — Lot 74 plan Appendix A.5; technical spec v7 §6.7 (read-only sheets
 * stack, Esc closes only the top one, Q49) and §6.6.4 (closing sends nothing).
 */
import { describe, expect, it } from 'vitest';

import { inPlayThumbs } from '../../view-model/card-actions';
import { makeCard, makeSelf } from '../../view-model/test-fixtures';
import {
  arenaSheetEntries, arenaSheetKey, closeArenaSheet, EMPTY_ARENA_SHEETS, MAX_CLOSING_SHEETS, openArenaSheet,
  type ArenaSheet,
} from './arena-sheets';
import { makeArenaView } from './test-view';

const SPY: ArenaSheet = { kind: 'card', source: { kind: 'hand', instance: makeCard('spy') } };
/** A fresh object with the same key as SPY: the reducer matches by key, not by reference. */
const SPY_AGAIN: ArenaSheet = { kind: 'card', source: { kind: 'hand', instance: makeCard('spy') } };
const QUEUE: ArenaSheet = { kind: 'card', source: { kind: 'queue', effectId: 'e9', cardId: 'basic-attack', isUpgraded: false } };
const KIT: ArenaSheet = { kind: 'kit', kitId: 'tactician' };

describe('arena sheets (Appendix A.5, spec v7 §6.7)', () => {
  it('starts with no open and no closing sheet', () => {
    expect(EMPTY_ARENA_SHEETS).toEqual({ open: [], closing: [] });
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
