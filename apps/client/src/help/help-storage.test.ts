/**
 * How to play / hint localStorage — technical spec v6 §5.1 / L42-02.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
  hasSeenHowToPlay,
  HINTS_STORAGE_KEY,
  HOW_TO_PLAY_SEEN_KEY,
  markHowToPlaySeen,
  resetHelpStorage,
} from './help-storage';

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

describe('help storage (technical spec v6 §5.1)', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('treats a missing key as unseen', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
    expect(hasSeenHowToPlay()).toBe(false);
  });

  it('Skip / Got it persist seen so a second visit does not gate', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
    markHowToPlaySeen();
    expect(globalThis.localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)).toBe('1');
    expect(hasSeenHowToPlay()).toBe(true);
  });

  it('Reset help clears How to play and hint keys', () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
    markHowToPlaySeen();
    storage.setItem(HINTS_STORAGE_KEY, '{"dismissed":[],"skipAll":true}');
    resetHelpStorage();
    expect(hasSeenHowToPlay()).toBe(false);
    expect(storage.getItem(HOW_TO_PLAY_SEEN_KEY)).toBeNull();
    expect(storage.getItem(HINTS_STORAGE_KEY)).toBeNull();
  });
});
