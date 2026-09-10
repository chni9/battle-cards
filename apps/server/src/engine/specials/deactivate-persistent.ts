/**
 * Deactivate a persistent special and return it to the shared pool — technical spec v4 §4.2, L20-13.
 *
 * Removes the effect from `activePersistentEffects` and pools it via
 * `poolDeactivatedPersistentEffects` (that helper only pushes; this primitive does both).
 * Returns the removed effect so auto-loss can log `persistentDeactivated` (L56-07).
 */

import type { GameState, PersistentEffect } from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';
import { recordAutoDeactivation } from './auto-deactivation-log';
import { poolDeactivatedPersistentEffects } from './pool-deactivated';

export function deactivatePersistentEffect(
  state: GameState,
  ownerId: string,
  effectId: string,
  logAutoLoss = false,
): PersistentEffect | null {
  const owner = findPlayer(state, ownerId);

  if (owner === undefined) {
    return null;
  }

  const effectIndex = owner.activePersistentEffects.findIndex(
    (effect) => effect.id === effectId,
  );

  if (effectIndex < 0) {
    return null;
  }

  const [effect] = owner.activePersistentEffects.splice(effectIndex, 1);

  if (effect === undefined) {
    return null;
  }

  poolDeactivatedPersistentEffects(state, [effect]);

  if (logAutoLoss) {
    recordAutoDeactivation(state, ownerId, effect);
  }

  return effect;
}
