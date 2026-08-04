/**
 * Send deactivated persistent specials to the shared pool — rules spec §5, L5-02.
 * Instance ids are seed-derived (technical spec v3 §8.1 / §10.3).
 */

import type { CardInstance, GameState, PersistentEffect } from '@card-battle/shared';

export function poolDeactivatedPersistentEffects(
  state: GameState,
  effects: readonly PersistentEffect[],
): void {
  for (const effect of effects) {
    const instance: CardInstance = {
      instanceId: `pool:${effect.id}:${String(state.pool.length)}`,
      cardId: effect.cardId,
      isUpgraded: effect.isUpgraded,
    };
    state.pool.push(instance);
  }
}
