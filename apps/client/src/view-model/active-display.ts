/**
 * Active-card thumbs for Table — persistents + combat Shield while points remain.
 * Shield has no activated PNG; use base/upgraded face art.
 */

import {
  ACTIVE_SHIELD_INSTANCE_ID,
  type CardInstance,
  type PersistentEffectView,
} from '@card-battle/shared';

export { ACTIVE_SHIELD_INSTANCE_ID };

export function persistentToCardInstance(
  effect: PersistentEffectView,
): CardInstance {
  return {
    instanceId: effect.id,
    cardId: effect.cardId,
    isUpgraded: effect.isUpgraded,
  };
}
