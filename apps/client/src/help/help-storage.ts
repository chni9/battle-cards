/**
 * Client teaching storage — technical spec v6 §5.1 / §5.2, L42-02 / L46-01.
 * How to play seen-flag and hint blob. Reset help clears both.
 */

import { isHintId, type HintId } from './hint-ids';

export const HOW_TO_PLAY_SEEN_KEY = 'card-battle.v6.howToPlaySeen';
export const HINTS_STORAGE_KEY = 'card-battle.v6.hints';

export type HowToPlayContinueTarget = 'online' | 'solo' | 'tutorial';

export interface HintStorageState {
  readonly dismissed: readonly HintId[];
  readonly skipAll: boolean;
}

export const EMPTY_HINT_STATE: HintStorageState = {
  dismissed: [],
  skipAll: false,
};

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

export function readHintState(): HintStorageState {
  const storage = tryStorage();
  if (storage === null) {
    return EMPTY_HINT_STATE;
  }
  const raw = storage.getItem(HINTS_STORAGE_KEY);
  if (raw === null) {
    return EMPTY_HINT_STATE;
  }
  try {
    return normalizeHintState(JSON.parse(raw) as unknown);
  } catch {
    return EMPTY_HINT_STATE;
  }
}

export function writeHintState(state: HintStorageState): void {
  const storage = tryStorage();
  if (storage === null) {
    return;
  }
  storage.setItem(
    HINTS_STORAGE_KEY,
    JSON.stringify({
      dismissed: [...state.dismissed],
      skipAll: state.skipAll,
    }),
  );
}

export function dismissHint(id: HintId): HintStorageState {
  return applyHintPatch(readHintState(), { ids: [id] });
}

export function skipAllHints(): HintStorageState {
  return applyHintPatch(readHintState(), { skipAll: true });
}

export function dismissHints(ids: readonly HintId[]): HintStorageState {
  return applyHintPatch(readHintState(), { ids });
}

/**
 * Merge dismissals onto the previous React blob so a later write cannot drop
 * an id that Got it already recorded (L46 follow-up).
 */
export function applyHintPatch(
  prev: HintStorageState,
  patch: { readonly ids?: readonly HintId[]; readonly skipAll?: boolean },
): HintStorageState {
  const skipAll = prev.skipAll || patch.skipAll === true;
  let dismissed = prev.dismissed;
  if (!prev.skipAll && patch.ids !== undefined) {
    const extra = patch.ids.filter((id) => !dismissed.includes(id));
    if (extra.length > 0) {
      dismissed = [...dismissed, ...extra];
    }
  }
  if (skipAll === prev.skipAll && dismissed === prev.dismissed) {
    return prev;
  }
  const next: HintStorageState = { dismissed, skipAll };
  writeHintState(next);
  return next;
}

function normalizeHintState(value: unknown): HintStorageState {
  if (typeof value !== 'object' || value === null) {
    return EMPTY_HINT_STATE;
  }
  const skipAll = Reflect.get(value, 'skipAll') === true;
  const dismissedRaw: unknown = Reflect.get(value, 'dismissed');
  const dismissed = Array.isArray(dismissedRaw)
    ? dismissedRaw.filter(isHintId)
    : [];
  return { dismissed, skipAll };
}
