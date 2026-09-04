/**
 * Game-over feedback ask-once flag (technical spec v6 §7.1 / L47-03).
 */

export const FEEDBACK_ASKED_KEY_PREFIX = 'card-battle.v6.feedbackAsked.';

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

export function feedbackAskedStorageKey(gameCode: string): string {
  return `${FEEDBACK_ASKED_KEY_PREFIX}${gameCode}`;
}

export function hasAskedFeedback(gameCode: string): boolean {
  const storage = tryStorage();
  if (storage === null) {
    return false;
  }
  return storage.getItem(feedbackAskedStorageKey(gameCode)) === '1';
}

export function markFeedbackAsked(gameCode: string): void {
  const storage = tryStorage();
  if (storage === null) {
    return;
  }
  storage.setItem(feedbackAskedStorageKey(gameCode), '1');
}
