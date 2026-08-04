/**
 * Deactivate a persistent special and return it to the shared pool — technical spec v4 §4.2, L20-13.
 *
 * Removes the effect from `activePersistentEffects` and pools it via
 * `poolDeactivatedPersistentEffects` (that helper only pushes; this primitive does both).
 */

import type { GameState } from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';
import { poolDeactivatedPersistentEffects } from './pool-deactivated';

export function deactivatePersistentEffect(
  state: GameState,
  ownerId: string,
  effectId: string,
): boolean {
  const owner = findPlayer(state, ownerId);

  if (owner === undefined) {
    return false;
  }

  const effectIndex = owner.activePersistentEffects.findIndex(
    (effect) => effect.id === effectId,
  );

  if (effectIndex < 0) {
    return false;
  }

  const [effect] = owner.activePersistentEffects.splice(effectIndex, 1);

  if (effect === undefined) {
    return false;
  }

  poolDeactivatedPersistentEffects(state, [effect]);
  return true;
}
