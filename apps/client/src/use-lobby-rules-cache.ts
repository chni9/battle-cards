/**
 * App's lobby-rules cache — technical spec v7 §6.10 source (1), §6.11; `view-model/rules-recall.ts`
 * (L73-12); L74-21.
 *
 * The server sends `lobbyRules` on lobby and finished views only, never on a playing view, so the
 * arena's turn clock and Table rules entry need the last lobby rules of this room. One
 * `nextRulesCache` step runs per new view identity: it allocates a new entry for every lobby view
 * (Play again brings the host's edited rules), so comparing caches instead would re-render forever.
 *
 * Online and solo alike: during a solo launch App shows Home, but the lobby views still reach
 * `view`. A null view keeps the cache (a reconnect keeps the table), so App clears it on every
 * leave; another room's first view drops it (`cachedLobbyRules` also checks the room code).
 */

import type { StateView } from '@card-battle/shared';
import { useCallback, useState } from 'react';

import { nextRulesCache, type RulesCache } from './view-model/rules-recall';

export interface LobbyRulesCacheHandle {
  /** This room's last lobby rules (`nextRulesCache`), null when unknown. */
  readonly cache: RulesCache | null;
  /** Forget them now: the player left (a null view alone keeps them, `nextRulesCache`). */
  readonly clear: () => void;
}

interface CacheState {
  /** The view identity last stepped, so a render with the same view runs no step. */
  readonly view: StateView | null;
  readonly cache: RulesCache | null;
}

export function useLobbyRulesCache(view: StateView | null): LobbyRulesCacheHandle {
  const [state, setState] = useState<CacheState>(() => ({ view, cache: nextRulesCache(null, view) }));
  // React's "adjust state while rendering" pattern, as `arena-screen.tsx` does: never an effect.
  if (state.view !== view) {
    setState({ view, cache: nextRulesCache(state.cache, view) });
  }
  const clear = useCallback((): void => {
    setState((current) => ({ view: current.view, cache: null }));
  }, []);
  return { cache: state.cache, clear };
}
