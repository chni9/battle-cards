/**
 * Hub What’s new seen-state — L63-07 / technical spec v6 §16.
 * `localStorage['card-battle.v6.lastSeenReleaseId']`. No accounts.
 */

import { latestReleaseNote } from '@card-battle/shared';

export const LAST_SEEN_RELEASE_ID_KEY = 'card-battle.v6.lastSeenReleaseId';

function tryStorage(): Storage | null {
  if (!('localStorage' in globalThis)) {
    return null;
  }
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readLastSeenReleaseId(): string | null {
  const storage = tryStorage();
  if (storage === null) {
    return null;
  }
  return storage.getItem(LAST_SEEN_RELEASE_ID_KEY);
}

export function markLatestReleaseSeen(): void {
  const storage = tryStorage();
  if (storage === null) {
    return;
  }
  storage.setItem(LAST_SEEN_RELEASE_ID_KEY, latestReleaseNote().id);
}

export function hasUnseenReleaseNotes(): boolean {
  return readLastSeenReleaseId() !== latestReleaseNote().id;
}

/**
 * First visit of the latest catalog id auto-opens (designer 2026-09-20 retest).
 * How to play is a Play-path gate, not a What’s new blocker.
 */
export function shouldAutoOpenWhatsNew(input: {
  latestUnseen: boolean;
}): boolean {
  return input.latestUnseen;
}
