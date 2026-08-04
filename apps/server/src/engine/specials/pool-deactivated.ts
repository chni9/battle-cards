/**
 * Send deactivated persistent specials to the shared pool — rules spec §5, L5-02.
 * Instance ids come from `GameState.nextPoolInstanceSeq` (technical spec v4 §3.3 #1),
 * never from `pool.length` or `seed`.
 */

import type { CardInstance, GameState, PersistentEffect } from '@card-battle/shared';

export function poolDeactivatedPersistentEffects(
  state: GameState,
  effects: readonly PersistentEffect[],
): void {
  for (const effect of effects) {
    const seq = state.nextPoolInstanceSeq;
    state.nextPoolInstanceSeq += 1;
    const instance: CardInstance = {
      instanceId: `pool:${effect.id}:${String(seq)}`,
      cardId: effect.cardId,
      isUpgraded: effect.isUpgraded,
    };
    state.pool.push(instance);
  }
}
