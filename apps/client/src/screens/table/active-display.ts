/**
 * Active-card thumbs for Table — persistents + combat Shield while points remain.
 * Shield has no activated PNG; use base/upgraded face art.
 */

import type { CardInstance, PersistentEffectView } from '@card-battle/shared';

/** Stable synthetic instance id for the active Shield thumb / inspect. */
export const ACTIVE_SHIELD_INSTANCE_ID = 'active-shield';

export function persistentToCardInstance(
  effect: PersistentEffectView,
): CardInstance {
  return {
    instanceId: effect.id,
    cardId: effect.cardId,
    isUpgraded: effect.isUpgraded,
  };
}

export function shieldActiveInstance(isUpgraded: boolean): CardInstance {
  return {
    instanceId: ACTIVE_SHIELD_INSTANCE_ID,
    cardId: 'shield',
    isUpgraded,
  };
}
