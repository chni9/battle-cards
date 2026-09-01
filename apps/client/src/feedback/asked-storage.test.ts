import { afterEach, describe, expect, it } from 'vitest';

import {
  feedbackAskedStorageKey,
  hasAskedFeedback,
  markFeedbackAsked,
} from './asked-storage';

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

describe('feedback asked storage (technical spec v6 §7.1 / L47-03)', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('records Skip or a successful submit once per gameCode', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
    expect(hasAskedFeedback('ABCDEF')).toBe(false);
    markFeedbackAsked('ABCDEF');
    expect(hasAskedFeedback('ABCDEF')).toBe(true);
    expect(hasAskedFeedback('ZZZZZZ')).toBe(false);
    expect(globalThis.localStorage.getItem(feedbackAskedStorageKey('ABCDEF'))).toBe('1');
  });

  it('treats missing localStorage as not asked', () => {
    expect(hasAskedFeedback('ABCDEF')).toBe(false);
    markFeedbackAsked('ABCDEF');
    expect(hasAskedFeedback('ABCDEF')).toBe(false);
  });
});
