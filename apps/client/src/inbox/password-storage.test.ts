import { afterEach, describe, expect, it } from 'vitest';

import {
  INBOX_PASSWORD_STORAGE_KEY,
  clearStoredInboxPassword,
  readStoredInboxPassword,
  storeInboxPassword,
} from './password-storage';

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

describe('inbox password storage (technical spec v6 §7.3 / L47-05)', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'sessionStorage');
  });

  it('stores the password after success and clears it on 401', () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
    expect(readStoredInboxPassword()).toBeNull();
    storeInboxPassword('secret');
    expect(readStoredInboxPassword()).toBe('secret');
    expect(globalThis.sessionStorage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBe('secret');
    clearStoredInboxPassword();
    expect(readStoredInboxPassword()).toBeNull();
  });

  it('does not read when sessionStorage is missing', () => {
    expect(readStoredInboxPassword()).toBeNull();
  });
});
