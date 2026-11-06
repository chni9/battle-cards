/**
 * The retired table switch (technical spec v7 §4.4; L72-20, retired by L75-09). Lots 72–75 kept the
 * V7 arena behind `?ui=next`, stored in `localStorage['card-battle.v7.ui']`. The arena is now the only
 * table: `?ui=` is never read, and `GameApp` removes the stale key once per page load.
 */

/** The Lots 72–75 table opt-in key (spec v7 §4.4; L72-20). The L75-09 flip retired it; boot clears it once. */
export const RETIRED_TABLE_SWITCH_KEY = 'card-battle.v7.ui';

/** The one Storage method the clear needs, so tests pass a memory or throwing store. */
export interface RemovableStorage {
  removeItem(key: string): void;
}

/** `localStorage`, or null when it is absent or its accessor throws (the `ui/release-storage.ts` pattern). */
export function browserRemovableStorage(): RemovableStorage | null {
  if (!('localStorage' in globalThis)) {
    return null;
  }
  try {
    return globalThis.localStorage;
  } catch {
    // Blocked site data or a private window: the accessor itself throws.
    return null;
  }
}

/** Removes the retired key; a null store or a throwing `removeItem` is a silent no-op (private window, blocked site data). */
export function clearRetiredTableSwitch(storage: RemovableStorage | null): void {
  if (storage === null) {
    return;
  }
  try {
    storage.removeItem(RETIRED_TABLE_SWITCH_KEY);
  } catch {
    // Blocked site data: nothing to clear, and the key is never read again.
  }
}
