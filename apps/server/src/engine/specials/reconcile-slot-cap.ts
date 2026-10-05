/**
 * When a play opens a fifth slot, peel it off and start a slot-drop sub-choice — Lot 69.
 */

import type { CardId, GameState, Player } from '@card-battle/shared';

import {
  type ActiveSlotRef,
  listActiveSlots,
  MAX_ACTIVE_SLOTS,
  clearActiveSlot,
} from './active-slots';
import { beginSlotDrop } from './slot-drop';
import type { PendingSlotActivationPayload } from '@card-battle/shared';

function newestSlot(slots: readonly ActiveSlotRef[]): ActiveSlotRef | null {
  if (slots.length === 0) {
    return null;
  }

  return slots.reduce<ActiveSlotRef | null>((newest, slot) => {
    if (newest === null || slot.slotQueuedAt > newest.slotQueuedAt) {
      return slot;
    }

    return newest;
  }, null);
}

function pendingFromSlot(
  owner: Player,
  slot: ActiveSlotRef,
): PendingSlotActivationPayload {
  if (slot.kind === 'shield') {
    return { kind: 'shield', isUpgraded: slot.isUpgraded };
  }

  if (slot.kind === 'sentence') {
    return { kind: 'sentence', sourcePlayerId: owner.id, isUpgraded: slot.isUpgraded };
  }

  const effect = owner.activePersistentEffects.find((entry) => entry.id === slot.id);

  return {
    kind: 'persistent',
    ownerPlayerId: owner.id,
    cardId: slot.cardId,
    isUpgraded: slot.isUpgraded,
    counter: effect?.counter ?? null,
    targetPlayerId: effect?.targetPlayerId ?? null,
    ...(effect?.originalCasterPlayerId !== undefined
      ? { originalCasterPlayerId: effect.originalCasterPlayerId }
      : {}),
  };
}

/** Call after a card play that may have opened a slot on `slotOwnerId`. */
export function reconcileSlotCapAfterPlay(
  state: GameState,
  slotOwnerId: string,
  nowMs: number,
): boolean {
  const owner = state.players.find((player) => player.id === slotOwnerId);

  if (owner === undefined) {
    return false;
  }

  const slots = listActiveSlots(state, slotOwnerId);

  if (slots.length <= MAX_ACTIVE_SLOTS) {
    return false;
  }

  const newest = newestSlot(slots);

  if (newest === null) {
    return false;
  }

  const pending = pendingFromSlot(owner, newest);
  clearActiveSlot(state, slotOwnerId, newest);

  beginSlotDrop(state, {
    playerId: slotOwnerId,
    pending,
    nowMs,
  });

  return true;
}

export function slotOwnerForCardPlay(
  actorPlayerId: string,
  cardId: CardId,
  targetPlayerId: string | null,
): string {
  if (cardId === 'curse' && targetPlayerId !== null) {
    return targetPlayerId;
  }

  return actorPlayerId;
}
