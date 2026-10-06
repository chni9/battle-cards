/**
 * Runtime guard for `subChoiceRequired` payloads (technical spec v4 §4.4).
 */

import type { SubChoiceRequiredPayload } from '@card-battle/shared';

export function isSubChoiceRequired(payload: unknown): payload is SubChoiceRequiredPayload {
  if (typeof payload !== 'object' || payload === null || !('kind' in payload)) {
    return false;
  }

  if (!('deadlineMs' in payload) || typeof payload.deadlineMs !== 'number') {
    return false;
  }

  switch (payload.kind) {
    case 'mirror':
      return 'eligibleEffectIds' in payload && Array.isArray(payload.eligibleEffectIds);
    case 'elimination-reward':
      return (
        'eliminationId' in payload &&
        typeof payload.eliminationId === 'string' &&
        'eliminatedPlayerId' in payload &&
        typeof payload.eliminatedPlayerId === 'string' &&
        'availableCards' in payload &&
        Array.isArray(payload.availableCards)
      );
    case 'steal-pick':
      return (
        'victimPlayerId' in payload &&
        typeof payload.victimPlayerId === 'string' &&
        'eligibleInstanceIds' in payload &&
        Array.isArray(payload.eligibleInstanceIds)
      );
    case 'pool-pick':
      return (
        'eligibleInstanceIds' in payload &&
        Array.isArray(payload.eligibleInstanceIds) &&
        'maxCount' in payload &&
        typeof payload.maxCount === 'number'
      );
    case 'special-pick':
      return 'eligibleCardIds' in payload && Array.isArray(payload.eligibleCardIds);
    case 'reanimation-kit':
      return 'eligibleKitIds' in payload && Array.isArray(payload.eligibleKitIds);
    case 'slot-drop': {
      if (
        !('slotOwnerPlayerId' in payload) ||
        typeof payload.slotOwnerPlayerId !== 'string' ||
        payload.slotOwnerPlayerId.length === 0
      ) {
        return false;
      }

      if (!('eligibleSlots' in payload) || !Array.isArray(payload.eligibleSlots)) {
        return false;
      }

      for (const slot of payload.eligibleSlots) {
        if (typeof slot !== 'object' || slot === null) {
          return false;
        }

        const record = slot as Record<string, unknown>;

        if (typeof record['id'] !== 'string' || record['id'].length === 0) {
          return false;
        }

        if (typeof record['cardId'] !== 'string' || record['cardId'].length === 0) {
          return false;
        }

        const kind = record['kind'];

        if (kind !== 'shield' && kind !== 'persistent' && kind !== 'sentence') {
          return false;
        }

        if (typeof record['isUpgraded'] !== 'boolean') {
          return false;
        }
      }

      return true;
    }
    default:
      return false;
  }
}
