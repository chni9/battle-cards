// The retired table switch: technical spec v7 §4.4 / L72-20, retired by L75-09.
import { afterEach, describe, expect, it } from 'vitest';

import {
  browserRemovableStorage, clearRetiredTableSwitch, RETIRED_TABLE_SWITCH_KEY, type RemovableStorage,
} from './retired-table-switch';

class MemoryStorage implements RemovableStorage {
  public readonly data = new Map<string, string>();
  public removeItem(key: string): void { this.data.delete(key); }
}

describe('retired table switch (spec v7 §4.4; L72-20, L75-09)', () => {
  afterEach(() => { Reflect.deleteProperty(globalThis, 'localStorage'); });

  it('pins the key the Lots 72–75 opt-in wrote', () => {
    expect(RETIRED_TABLE_SWITCH_KEY).toBe('card-battle.v7.ui');
  });

  it('removes the retired key and keeps every other key', () => {
    const storage = new MemoryStorage();
    storage.data.set('card-battle.v7.ui', 'next');
    storage.data.set('card-battle.v6.hints', '{}');
    clearRetiredTableSwitch(storage);
    expect([...storage.data.entries()]).toEqual([['card-battle.v6.hints', '{}']]);
  });

  it('never throws when removeItem throws or there is no storage', () => {
    expect(() => { clearRetiredTableSwitch({ removeItem: () => { throw new DOMException('blocked'); } }); }).not.toThrow();
    expect(() => { clearRetiredTableSwitch(null); }).not.toThrow();
  });

  it('browserRemovableStorage returns localStorage, or null when it is missing or its getter throws', () => {
    expect(browserRemovableStorage()).toBeNull();
    const store = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: store });
    expect(browserRemovableStorage()).toBe(store);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('storage blocked'); } });
    expect(browserRemovableStorage()).toBeNull();
  });
});
