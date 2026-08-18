/**
 * Deep clone for search-owned states — technical spec v5 §4.1 / §10.1 (L32-04).
 *
 * `GameState` is a plain JSON object graph (no Map/Set/Date/class instances).
 * Start with `structuredClone`; escalate to a hand-written clone only if a bench
 * or independence test requires it.
 */

import type { GameState } from '@card-battle/shared';

export function cloneGameState(state: GameState): GameState {
  return structuredClone(state);
}
