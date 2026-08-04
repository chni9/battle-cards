/**
 * Pool removal — technical spec v4 §4.2, §4.3, backlog L20-14.
 *
 * The pool's first read path. Callers re-home the returned instance via
 * `transferCardInstance` so `alwaysUpgraded` applies.
 */

import type { CardInstance, GameState } from '@card-battle/shared';

/** Remove a pool instance by id. Returns the instance for caller to re-home. */
export function takeFromPool(
  state: GameState,
  instanceId: string,
): CardInstance | undefined {
  const index = state.pool.findIndex((card) => card.instanceId === instanceId);

  if (index < 0) {
    return undefined;
  }

  const [card] = state.pool.splice(index, 1);
  return card;
}
