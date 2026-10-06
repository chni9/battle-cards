/**
 * Host table rules — rules spec §6 Setup.
 * Classic lobby and solo only. The tutorial does not use them.
 */

import { isKitId } from '../domain/kit-catalog';
import { KIT_IDS, type KitId } from '../domain/kit';

/** Human turn length the host may set. Default matches `TURN_DURATION_MS` (60s). */
export const MIN_TURN_TIME_SECONDS = 5;
export const MAX_TURN_TIME_SECONDS = 180;
export const DEFAULT_TURN_TIME_SECONDS = 60;

/**
 * Rules the host sets before start. `turnTimeSeconds` on a view is the length
 * human turns will use, which follows the server default until the host sets one.
 */
export interface LobbyRules {
  /** Classic kits the host has excluded. Empty means every kit is allowed. */
  excludedKitIds: readonly KitId[];
  /** Nobody picks a kit. Seats are dealt from the kits still allowed. */
  randomOnly: boolean;
  /** Whole seconds. Host control is 5–180. A server default may be higher. */
  turnTimeSeconds: number;
}

export function defaultLobbyRules(): LobbyRules {
  return {
    excludedKitIds: [],
    randomOnly: false,
    turnTimeSeconds: DEFAULT_TURN_TIME_SECONDS,
  };
}

export function isTurnTimeSeconds(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_TURN_TIME_SECONDS &&
    value <= MAX_TURN_TIME_SECONDS
  );
}

/** Kits a seat may choose or be dealt. At least one when `excludedKitIds` is valid. */
export function allowedKitIds(rules: Pick<LobbyRules, 'excludedKitIds'>): readonly KitId[] {
  const excluded = new Set(rules.excludedKitIds);
  return KIT_IDS.filter((kitId) => !excluded.has(kitId));
}

/**
 * Drop or restore one kit. Returns null when the click would leave none allowed.
 */
export function toggleExcludedKit(rules: LobbyRules, kitId: KitId): LobbyRules | null {
  const excluded = new Set(rules.excludedKitIds);

  if (excluded.has(kitId)) {
    excluded.delete(kitId);
  } else if (allowedKitIds(rules).length <= 1) {
    return null;
  } else {
    excluded.add(kitId);
  }

  return {
    ...rules,
    excludedKitIds: KIT_IDS.filter((id) => excluded.has(id)),
  };
}

export function parseExcludedKitIds(
  value: unknown,
): { ok: true; excludedKitIds: readonly KitId[] } | { ok: false; reason: 'invalid' | 'none-allowed' } {
  if (!Array.isArray(value)) {
    return { ok: false, reason: 'invalid' };
  }

  const seen = new Set<KitId>();

  for (const entry of value) {
    if (typeof entry !== 'string' || !isKitId(entry) || seen.has(entry)) {
      return { ok: false, reason: 'invalid' };
    }

    seen.add(entry);
  }

  if (seen.size >= KIT_IDS.length) {
    return { ok: false, reason: 'none-allowed' };
  }

  return {
    ok: true,
    excludedKitIds: KIT_IDS.filter((kitId) => seen.has(kitId)),
  };
}
