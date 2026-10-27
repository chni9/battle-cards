/**
 * Temporary table switch (technical spec v7 §4.4 / L72-20): `?ui=next` selects the V7 arena
 * and persists `localStorage['card-battle.v7.ui']`, `?ui=classic` clears it, otherwise the
 * stored value applies. Tutorial rooms always get the classic table until L75 re-anchors the
 * tutorial. L75 flips the default, removes this module and clears the key.
 *
 * Every storage access sits in try/catch (private window, blocked site data): the switch then
 * degrades to the classic table, or to the query param for the current load, and never throws.
 */

import type { PlayKind } from '@card-battle/shared';

export const UI_SWITCH_STORAGE_KEY = 'card-battle.v7.ui';
export const UI_SWITCH_QUERY_PARAM = 'ui';

export type TableUi = 'classic' | 'next';
/** What `?ui=` asked for on this page load; `null` when absent or not a recognised value. */
export type UiSwitchParam = TableUi | null;

/** The slice of `Storage` the switch needs, so tests can pass a memory or throwing store. */
export interface UiSwitchStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** `localStorage`, or `null` when it is absent or its accessor throws (pattern of `feedback/asked-storage.ts`). */
export function browserUiSwitchStorage(): UiSwitchStorage | null {
  if (!('localStorage' in globalThis)) {
    return null;
  }
  try {
    return globalThis.localStorage;
  } catch {
    // Blocked site data or a private window: the accessor itself throws.
    return null;
  }
}

/** Only the exact values `next` and `classic` count; anything else leaves the stored choice alone. */
export function parseUiSwitchParam(search: string): UiSwitchParam {
  const value = new URLSearchParams(search).get(UI_SWITCH_QUERY_PARAM);
  return value === 'next' || value === 'classic' ? value : null;
}

/** Only the stored value `next` opts in; a missing, unknown or unreadable value is classic. */
export function readStoredTableUi(storage: UiSwitchStorage | null): TableUi {
  if (storage === null) {
    return 'classic';
  }
  try {
    return storage.getItem(UI_SWITCH_STORAGE_KEY) === 'next' ? 'next' : 'classic';
  } catch {
    // Reads can throw on their own, so an unreadable key falls back to the classic table.
    return 'classic';
  }
}

/**
 * Applies `?ui=` once per page load and returns the preference for this load. A failed write
 * never changes the answer: the param still wins for the current load, it just is not kept.
 */
export function applyUiSwitchParam(param: UiSwitchParam, storage: UiSwitchStorage | null): TableUi {
  if (param === null) {
    return readStoredTableUi(storage);
  }
  if (storage !== null) {
    try {
      if (param === 'next') {
        storage.setItem(UI_SWITCH_STORAGE_KEY, 'next');
      } else {
        storage.removeItem(UI_SWITCH_STORAGE_KEY);
      }
    } catch {
      // Blocked storage: honor the param for this load without persisting it.
    }
  }
  return param;
}

/** Tutorial rooms ignore the preference until L75 re-anchors the tutorial (spec v7 §4.4). */
export function resolveTableUi(input: { preference: TableUi; playKind: PlayKind }): TableUi {
  return input.playKind === 'tutorial' ? 'classic' : input.preference;
}
