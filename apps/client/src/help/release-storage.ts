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
 * How to play first-play gate still wins if both would fire (L63-07).
 */
export function shouldAutoOpenWhatsNew(input: {
  howToPlaySeen: boolean;
  latestUnseen: boolean;
}): boolean {
  return input.howToPlaySeen && input.latestUnseen;
}
