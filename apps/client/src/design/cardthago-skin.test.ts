import { afterEach, describe, expect, it } from 'vitest';

import {
  CARDTHAGO_SKIN_STORAGE_KEY,
  readCardthagoSkin,
  writeCardthagoSkin,
} from './cardthago-skin';

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  public get length(): number {
    return this.data.size;
  }

  public clear(): void {
    this.data.clear();
  }

  public getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.data.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('cardthago skin storage', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('defaults to atelier', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
    expect(readCardthagoSkin()).toBe('atelier');
  });

  it('persists fresque in localStorage', () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
    writeCardthagoSkin('fresque');
    expect(storage.getItem(CARDTHAGO_SKIN_STORAGE_KEY)).toBe('fresque');
    expect(readCardthagoSkin()).toBe('fresque');
  });
});
