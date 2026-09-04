/**
 * Inbox session password (technical spec v6 §7.3 / L47-05).
 * sessionStorage only — survives refresh in the tab, not a new browser.
 */

export const INBOX_PASSWORD_STORAGE_KEY = 'card-battle.v6.inboxPassword';

function trySessionStorage(): Storage | null {
  if (!('sessionStorage' in globalThis)) {
    return null;
  }
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

export function readStoredInboxPassword(): string | null {
  const storage = trySessionStorage();
  if (storage === null) {
    return null;
  }
  const value = storage.getItem(INBOX_PASSWORD_STORAGE_KEY);
  if (value === null || value.length === 0) {
    return null;
  }
  return value;
}

export function storeInboxPassword(password: string): void {
  const storage = trySessionStorage();
  if (storage === null || password.length === 0) {
    return;
  }
  storage.setItem(INBOX_PASSWORD_STORAGE_KEY, password);
}

export function clearStoredInboxPassword(): void {
  const storage = trySessionStorage();
  if (storage === null) {
    return;
  }
  storage.removeItem(INBOX_PASSWORD_STORAGE_KEY);
}
