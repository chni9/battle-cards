/**
 * Send deactivated persistent specials to the shared pool — rules spec §5, L5-02.
 */

import type { CardInstance, GameState, PersistentEffect } from '@card-battle/shared';
import { randomUUID } from 'node:crypto';

export function poolDeactivatedPersistentEffects(
  state: GameState,
  effects: readonly PersistentEffect[],
): void {
  for (const effect of effects) {
    const instance: CardInstance = {
      instanceId: randomUUID(),
      cardId: effect.cardId,
      isUpgraded: effect.isUpgraded,
    };
    state.pool.push(instance);
  }
}
