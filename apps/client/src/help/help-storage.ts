/**
 * Client teaching storage — technical spec v6 §5.1 / §5.2, L42-02.
 * How to play seen-flag and hint blob (Lot 46 writes the JSON; `resetHelpStorage` clears both).
 */

export const HOW_TO_PLAY_SEEN_KEY = 'card-battle.v6.howToPlaySeen';
export const HINTS_STORAGE_KEY = 'card-battle.v6.hints';

export type HowToPlayContinueTarget = 'online' | 'solo' | 'tutorial';

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

export function hasSeenHowToPlay(): boolean {
  const storage = tryStorage();
  if (storage === null) {
    return false;
  }
  return storage.getItem(HOW_TO_PLAY_SEEN_KEY) === '1';
}

export function markHowToPlaySeen(): void {
  const storage = tryStorage();
  if (storage === null) {
    return;
  }
  storage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');
}

/** Designer retest control — clears How to play and first-game hint keys. */
export function resetHelpStorage(): void {
  const storage = tryStorage();
  if (storage === null) {
    return;
  }
  storage.removeItem(HOW_TO_PLAY_SEEN_KEY);
  storage.removeItem(HINTS_STORAGE_KEY);
}
