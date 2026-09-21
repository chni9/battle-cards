/**
 * What’s new localStorage — L63-07.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { latestReleaseNote } from '@card-battle/shared';

import {
  hasUnseenReleaseNotes,
  LAST_SEEN_RELEASE_ID_KEY,
  markLatestReleaseSeen,
  readLastSeenReleaseId,
  shouldAutoOpenWhatsNew,
} from './release-storage';

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

describe('release storage (L63-07)', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('treats a missing key as unread against the latest catalog id', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
    expect(readLastSeenReleaseId()).toBeNull();
    expect(hasUnseenReleaseNotes()).toBe(true);
    expect(latestReleaseNote().id).toBe('lot-64');
  });

  it('Got it writes the latest id so a second visit is read', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
    markLatestReleaseSeen();
    expect(globalThis.localStorage.getItem(LAST_SEEN_RELEASE_ID_KEY)).toBe('lot-64');
    expect(hasUnseenReleaseNotes()).toBe(false);
  });

  it('treats a stale stored id as unread', () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
    storage.setItem(LAST_SEEN_RELEASE_ID_KEY, 'lot-63');
    expect(hasUnseenReleaseNotes()).toBe(true);
  });

  it('auto-opens this version when last-seen is not lot-64', () => {
    expect(shouldAutoOpenWhatsNew({ latestUnseen: true })).toBe(true);
    expect(shouldAutoOpenWhatsNew({ latestUnseen: false })).toBe(false);
  });

  it('treats missing localStorage as unread and ignores write failures', () => {
    Reflect.deleteProperty(globalThis, 'localStorage');
    expect(hasUnseenReleaseNotes()).toBe(true);
    markLatestReleaseSeen();
    expect(readLastSeenReleaseId()).toBeNull();
  });
});
