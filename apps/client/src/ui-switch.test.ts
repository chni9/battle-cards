// Temporary table switch: technical spec v7 §4.4 / L72-20. L75 deletes it with ui-switch.ts.
import { afterEach, describe, expect, it } from 'vitest';

import {
  applyUiSwitchParam, browserUiSwitchStorage, parseUiSwitchParam, readStoredTableUi,
  resolveTableUi, UI_SWITCH_QUERY_PARAM, UI_SWITCH_STORAGE_KEY, type UiSwitchStorage,
} from './ui-switch';

class MemoryStorage implements UiSwitchStorage {
  public readonly data = new Map<string, string>();
  public getItem(key: string): string | null { return this.data.get(key) ?? null; }
  public setItem(key: string, value: string): void { this.data.set(key, value); }
  public removeItem(key: string): void { this.data.delete(key); }
}
const fail = (): never => { throw new Error('storage blocked'); };
/** Private window or blocked site data: every call throws (spec v7 §4.4 try/catch rule). */
const blocked: UiSwitchStorage = { getItem: fail, setItem: fail, removeItem: fail };
function storageWith(value: string): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(UI_SWITCH_STORAGE_KEY, value);
  return storage;
}

describe('table ui switch (technical spec v7 §4.4 / L72-20)', () => {
  afterEach(() => { Reflect.deleteProperty(globalThis, 'localStorage'); });

  it('pins the localStorage key and the query param', () => {
    expect(UI_SWITCH_STORAGE_KEY).toBe('card-battle.v7.ui');
    expect(UI_SWITCH_QUERY_PARAM).toBe('ui');
  });

  it('reads only ?ui=next and ?ui=classic from the query string', () => {
    expect(parseUiSwitchParam('?ui=next')).toBe('next');
    expect(parseUiSwitchParam('?ui=classic')).toBe('classic');
    expect(parseUiSwitchParam('ui=next')).toBe('next');
    expect(parseUiSwitchParam('?code=ABCDEF&ui=next')).toBe('next');
    for (const search of ['', '?ui=', '?ui=NEXT', '?ui=v7', '?view=next']) {
      expect(parseUiSwitchParam(search)).toBeNull();
    }
  });

  it('?ui=next selects V7 and persists it for later loads', () => {
    const storage = new MemoryStorage();
    expect(applyUiSwitchParam('next', storage)).toBe('next');
    expect(storage.getItem('card-battle.v7.ui')).toBe('next');
    expect(applyUiSwitchParam(null, storage)).toBe('next'); // reload without the param keeps V7
  });

  it('?ui=classic clears the key', () => {
    const storage = storageWith('next');
    expect(applyUiSwitchParam('classic', storage)).toBe('classic');
    expect(storage.data.has('card-battle.v7.ui')).toBe(false);
    expect(applyUiSwitchParam(null, storage)).toBe('classic');
  });

  it('without a param the stored value applies, and only "next" opts in', () => {
    expect(applyUiSwitchParam(null, new MemoryStorage())).toBe('classic');
    expect(applyUiSwitchParam(null, storageWith('next'))).toBe('next');
    expect(readStoredTableUi(storageWith('next'))).toBe('next');
    for (const storage of [storageWith('classic'), storageWith('NEXT'), new MemoryStorage(), null]) {
      expect(readStoredTableUi(storage)).toBe('classic');
    }
  });

  it('tutorial rooms always get the classic table', () => {
    for (const preference of ['next', 'classic'] as const) {
      expect(resolveTableUi({ preference, playKind: 'tutorial' })).toBe('classic');
      expect(resolveTableUi({ preference, playKind: 'classic' })).toBe(preference);
    }
  });

  it('a throwing storage never throws and still honors the param for this load', () => {
    expect(applyUiSwitchParam('next', blocked)).toBe('next');
    expect(applyUiSwitchParam('classic', blocked)).toBe('classic');
    expect(applyUiSwitchParam(null, blocked)).toBe('classic');
    expect(readStoredTableUi(blocked)).toBe('classic');
  });

  it('works with no storage at all', () => {
    expect(applyUiSwitchParam('next', null)).toBe('next');
    expect(applyUiSwitchParam('classic', null)).toBe('classic');
    expect(applyUiSwitchParam(null, null)).toBe('classic');
  });

  it('browserUiSwitchStorage returns localStorage, or null when it is missing or its getter throws', () => {
    expect(browserUiSwitchStorage()).toBeNull();
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    expect(browserUiSwitchStorage()).toBe(storage);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: fail });
    expect(browserUiSwitchStorage()).toBeNull();
    expect(applyUiSwitchParam(parseUiSwitchParam('?ui=next'), browserUiSwitchStorage())).toBe('next');
  });
});
