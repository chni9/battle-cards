/**
 * Table rules recall and the turn-length source selection — technical spec v7 §6.11, §7.6 and
 * §6.10 source (1); Lot 73 (L73-12).
 *
 * Parity: Appendix A `rules-recall-table-end` / `lobby-rules-summary`. A `RulesRecall` is a
 * `LobbyRules`, so it passes straight to `RulesStrip` / `RulesSheet` as `rules` (L72-16).
 *
 * The cache holds the last lobby rules seen and the room they belong to. It lives in memory
 * only (Lot 74 keeps it in App state), so a reload mid-game leaves no rules to recall: callers
 * hide the strip on `null`, and this module invents no default. The server sends
 * `lobbyRules` on lobby and finished views only (PROTOCOL_VERSION 45), never on a playing view,
 * which is why the table needs the cache at all.
 */

import {
  allowedKitIds,
  type FinishedStateView,
  type KitId,
  type LobbyRules,
  type LobbyStateView,
  type PlayingStateView,
  type StateView,
} from '@card-battle/shared';

/** Spec v7 §6.11 / §7.6. A `LobbyRules`, so it passes straight to `RulesStrip` / `RulesSheet` (L72-16). */
export interface RulesRecall extends LobbyRules {
  /** Kits a seat may pick or be dealt, in `KIT_IDS` order (shared `allowedKitIds`). */
  readonly allowedKitIds: readonly KitId[];
}

/** The cache step's state: the last lobby rules seen and the room they belong to. */
export interface RulesCache {
  readonly gameCode: string;
  readonly rules: LobbyRules;
}

// `excludedKitIds` and the seconds are returned as received: the server already orders the kits
// by `KIT_IDS`, and the seconds follow `TURN_DURATION_MS` until the host sets one, so they can
// exceed the host maximum of 180 (frontend.md, Rules).
function recallOf(rules: LobbyRules): RulesRecall {
  return {
    excludedKitIds: rules.excludedKitIds,
    randomOnly: rules.randomOnly,
    turnTimeSeconds: rules.turnTimeSeconds,
    allowedKitIds: allowedKitIds(rules),
  };
}

/**
 * The rules a lobby or finished view carries, shaped for the rules strip. Null when the view
 * carries none, or for a tutorial finish: "the tutorial never shows rules" (spec v7 §6.11), even
 * if a field were present. `LobbyStateView` has no `playKind`, so a lobby caller keeps "never
 * mount the strip in the tutorial" (§7.4).
 */
export function rulesRecall(view: LobbyStateView | FinishedStateView): RulesRecall | null {
  if (view.phase === 'finished' && view.playKind === 'tutorial') return null;
  return view.lobbyRules === undefined ? null : recallOf(view.lobbyRules);
}

/**
 * The next cache for the view that just arrived (spec v7 §6.11). Pure state in, state out, so
 * Lot 74 owns only the `useState`.
 */
export function nextRulesCache(cache: RulesCache | null, view: StateView | null): RulesCache | null {
  // A null view carries no room code to compare, and a reconnect keeps the table view
  // (frontend.md "does not clear the table view"); the next room's first view drops a stale entry.
  if (view === null) return cache;
  // Every lobby view of a room replaces the cache, Play again included: the host may have edited
  // the rules between games.
  if (view.phase === 'lobby' && view.lobbyRules !== undefined) {
    return { gameCode: view.gameCode, rules: view.lobbyRules };
  }
  // Same object for the same room, so React skips the update; another room drops it.
  return cache?.gameCode === view.gameCode ? cache : null;
}

/**
 * Turn-length source (1) for `turnClock` (spec v7 §6.10): this room's cached rules for a Classic
 * table, else null. The tutorial guard sits here because the server sends `lobbyRules` on every
 * lobby view, the tutorial's too, so the cache can hold a tutorial room's rules.
 */
export function cachedLobbyRules(cache: RulesCache | null, view: PlayingStateView): LobbyRules | null {
  return cache?.gameCode === view.gameCode && view.playKind === 'classic' ? cache.rules : null;
}

/** Menu → Table rules on the table (spec v7 §6.11): the cached rules, or null when unknown. */
export function tableRulesRecall(cache: RulesCache | null, view: PlayingStateView): RulesRecall | null {
  const rules = cachedLobbyRules(cache, view);
  return rules === null ? null : recallOf(rules);
}
