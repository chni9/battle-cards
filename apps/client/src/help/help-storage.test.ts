/**
 * How to play / hint localStorage — technical spec v6 §5.1 / L42-02.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
  applyHintPatch,
  dismissHint,
  dismissHints,
  EMPTY_HINT_STATE,
  hasSeenHowToPlay,
  HINTS_STORAGE_KEY,
  HOW_TO_PLAY_SEEN_KEY,
  markHowToPlaySeen,
  readHintState,
  resetHelpStorage,
  skipAllHints,
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

  it('resetHelpStorage clears How to play and hint keys', () => {
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

describe('hint storage blob (technical spec v6 §5.2 / L46-01)', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  function withStorage(): MemoryStorage {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
    return storage;
  }

  it('treats a missing or corrupt blob as empty', () => {
    const storage = withStorage();
    expect(readHintState()).toEqual(EMPTY_HINT_STATE);
    storage.setItem(HINTS_STORAGE_KEY, '{not-json');
    expect(readHintState()).toEqual(EMPTY_HINT_STATE);
    storage.setItem(HINTS_STORAGE_KEY, '{"dismissed":["leave"],"skipAll":false}');
    expect(readHintState()).toEqual(EMPTY_HINT_STATE);
  });

  it('Got it appends an id and Skip all sets skipAll', () => {
    withStorage();
    expect(dismissHint('your-turn')).toEqual({
      dismissed: ['your-turn'],
      skipAll: false,
    });
    expect(dismissHint('your-turn').dismissed).toEqual(['your-turn']);
    expect(skipAllHints()).toEqual({
      dismissed: ['your-turn'],
      skipAll: true,
    });
    expect(readHintState().skipAll).toBe(true);
  });

  it('dismissHints writes several ids in one blob', () => {
    withStorage();
    expect(dismissHints(['your-turn', 'draw'])).toEqual({
      dismissed: ['your-turn', 'draw'],
      skipAll: false,
    });
  });

  it('applyHintPatch keeps earlier ids when a later dismiss merges', () => {
    withStorage();
    const afterHidden = applyHintPatch(EMPTY_HINT_STATE, { ids: ['hidden-kit'] });
    expect(afterHidden.dismissed).toEqual(['hidden-kit']);
    expect(applyHintPatch(afterHidden, { ids: ['incoming'] }).dismissed).toEqual([
      'hidden-kit',
      'incoming',
    ]);
  });
});
