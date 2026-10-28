/**
 * Arena sheets reducer — technical spec v7 §6.7 (read-only sheets stack; Esc closes only the top
 * one, Q49) and §6.6.4 (opening, closing and long-pressing send nothing); Lot 74 plan Appendix A.5.
 *
 * `open` lists the read-only sheets, oldest first; the `Sheet` primitive paints the newest two
 * (MAX_READ_ONLY_DEPTH). A closed sheet moves to `closing` and stays mounted with `open={false}`
 * through its exit: the Sheet press shield then covers a second tap, so a double tap on a backdrop
 * or a sheet button never lands on the arena underneath (a seat, Draw). A sheet is rendered once
 * per entry of `arenaSheetEntries`, as a direct child of the arena root and never inside a
 * clickable element, because a React portal bubbles clicks to its ancestors (frontend.md
 * "L74 carry-overs").
 *
 * Every transition spreads `...state`, so the fields later tasks add (L74-10 `targeting`) pass
 * through untouched.
 *
 * Targeting is exclusive (L74-10, spec v7 §6.6.2; decisions.md 2026-10-28 "V7 targeting and
 * pre-send choices"): entering it keeps only the targeted card sheet open (collapsed into the
 * "Choose a target" bar) and closes every other read-only sheet, opening any sheet ends it first,
 * and closing the targeted sheet clears it. So no expanded read-only sheet ever sits under the
 * bar, and Esc always reaches the arena's targeting handler.
 */

import type { KitId } from '@card-battle/shared';

import { sheetInstanceFor, type CardSheetSource } from './card-sheet-source';

export type ArenaSheet =
  | { kind: 'card'; source: CardSheetSource }
  | { kind: 'kit'; kitId: KitId }
  /** An opponent seat's sheet (L74-05, spec v7 §6.5). */
  | { kind: 'seat'; playerId: string };

/** The card being targeted (L74-10, spec v7 §6.6.2). */
export interface TargetingState {
  /** The card sheet that collapsed into the bar. */
  readonly sheetKey: string;
  readonly instanceId: string;
  /** From `cardActions(...).use` routed `target`. */
  readonly seatIds: readonly string[];
}

export interface ArenaSheetsState {
  /** Open read-only sheets, oldest first. The `Sheet` primitive paints the newest two (MAX_READ_ONLY_DEPTH). */
  readonly open: readonly ArenaSheet[];
  /** The last closed sheets, mounted with `open={false}` through their exit (press shield). */
  readonly closing: readonly ArenaSheet[];
  /** L74-10: the card being targeted, or null. While set, that card sheet is `collapsed` into the bar. */
  readonly targeting: TargetingState | null;
}

export const EMPTY_ARENA_SHEETS: ArenaSheetsState = { open: [], closing: [], targeting: null };

/** One close per tap, and two quick closes are the worst case before an exit (220 ms) ends. */
export const MAX_CLOSING_SHEETS = 2;

function unreachable(value: never): never {
  void value;
  throw new Error('Unhandled arena sheet');
}

/** `card:<sheetInstanceFor(source).instanceId>`, `kit:<kitId>`, `seat:<playerId>`. The React key and `data-arena-sheet`. */
export function arenaSheetKey(sheet: ArenaSheet): string {
  switch (sheet.kind) {
    case 'card':
      return `card:${sheetInstanceFor(sheet.source).instanceId}`;
    case 'kit':
      return `kit:${sheet.kitId}`;
    case 'seat':
      return `seat:${sheet.playerId}`;
    default:
      return unreachable(sheet);
  }
}

function withoutKey(sheets: readonly ArenaSheet[], key: string): readonly ArenaSheet[] {
  return sheets.filter((entry) => arenaSheetKey(entry) !== key);
}

/**
 * Opens a sheet on top. One already open (same key) moves to the end and out of `closing`.
 * Opening any sheet ends targeting first (L74-10, §6.6.2): targeting is exclusive.
 */
export function openArenaSheet(state: ArenaSheetsState, sheet: ArenaSheet): ArenaSheetsState {
  const base = state.targeting === null ? state : endTargeting(state);
  const key = arenaSheetKey(sheet);
  const top = base.open.at(-1);
  if (top !== undefined && arenaSheetKey(top) === key && !base.closing.some((entry) => arenaSheetKey(entry) === key)) {
    return base;
  }
  return { ...base, open: [...withoutKey(base.open, key), sheet], closing: withoutKey(base.closing, key) };
}

/**
 * Moves an open sheet to `closing`, keeping the last `MAX_CLOSING_SHEETS`. Closing one that is not
 * open does nothing. Closing the targeted sheet clears targeting (L74-10).
 */
export function closeArenaSheet(state: ArenaSheetsState, sheet: ArenaSheet): ArenaSheetsState {
  const key = arenaSheetKey(sheet);
  const closed = state.open.find((entry) => arenaSheetKey(entry) === key);
  if (closed === undefined) {
    return state;
  }
  return {
    ...state,
    open: withoutKey(state.open, key),
    closing: [...withoutKey(state.closing, key), closed].slice(-MAX_CLOSING_SHEETS),
    targeting: state.targeting?.sheetKey === key ? null : state.targeting,
  };
}

/**
 * Keeps only the targeted card sheet open and records `targeting` (L74-10, §6.6.2). Every other
 * open sheet closes through its exit, oldest first, as `closeArenaSheet` does, so targeting is
 * exclusive. A request for a sheet that is not open changes nothing, and a second Use on the
 * sheet already targeted alone is idempotent.
 */
export function startTargeting(state: ArenaSheetsState, targeting: TargetingState): ArenaSheetsState {
  const targeted = state.open.find((entry) => arenaSheetKey(entry) === targeting.sheetKey);
  if (targeted === undefined) {
    return state;
  }
  if (state.targeting?.sheetKey === targeting.sheetKey && state.open.length === 1) {
    return state;
  }
  const closed = state.open
    .filter((entry) => entry !== targeted)
    .reduce(closeArenaSheet, { ...state, targeting: null });
  return { ...closed, open: [targeted], targeting };
}

/** Closes the targeted sheet as `closeArenaSheet` does and clears `targeting` (L74-10). */
export function endTargeting(state: ArenaSheetsState): ArenaSheetsState {
  const { targeting } = state;
  if (targeting === null) {
    return state;
  }
  const targeted = state.open.find((entry) => arenaSheetKey(entry) === targeting.sheetKey);
  return targeted === undefined ? { ...state, targeting: null } : closeArenaSheet(state, targeted);
}

export interface ArenaSheetEntry {
  readonly sheet: ArenaSheet;
  readonly key: string;
  readonly open: boolean;
}

/** `closing` entries (open: false), then `open` entries (open: true): render one Sheet per entry, keyed by `key`. */
export function arenaSheetEntries(state: ArenaSheetsState): readonly ArenaSheetEntry[] {
  return [
    ...state.closing.map((sheet) => ({ sheet, key: arenaSheetKey(sheet), open: false })),
    ...state.open.map((sheet) => ({ sheet, key: arenaSheetKey(sheet), open: true })),
  ];
}

/**
 * The player of the newest open seat sheet, else null: that seat is "tapped" (spec v7 §6.5, its
 * arrows light up). A card or kit sheet opened above it does not untap the seat, and a seat sheet
 * that is only `closing` no longer counts.
 */
export function openSeatId(state: ArenaSheetsState): string | null {
  for (let index = state.open.length - 1; index >= 0; index -= 1) {
    const sheet = state.open[index];
    if (sheet?.kind === 'seat') {
      return sheet.playerId;
    }
  }
  return null;
}
