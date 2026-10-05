/**
 * Forced active-slot drop when a fifth slot would open — Lot 69.
 */

import {
  actionReject,
  type ActionReject,
  type GameState,
  type PendingSlotActivationPayload,
} from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';
import { startPendingSentence } from '../turn/pending-sentences';
import { SUB_CHOICE_MS } from '../turn/sub-choice';
import { activatePersistentEffect } from './activate-persistent';
import {
  clearActiveSlot,
  listActiveSlots,
  oldestActiveSlot,
} from './active-slots';

/** Bots drop the oldest occupied slot on the pending victim (Lot 69). */
export function botDefaultSlotDropId(state: GameState, chooserPlayerId: string): string {
  const choice = state.subChoice;

  if (choice?.kind !== 'slot-drop' || choice.playerId !== chooserPlayerId) {
    throw new Error('slot drop pending but no active slots');
  }

  const drop = oldestActiveSlot(listActiveSlots(state, choice.slotOwnerId));

  if (drop === null) {
    throw new Error('slot drop pending but no active slots');
  }

  return drop.id;
}

export const SLOT_DROP_SUB_CHOICE_MS = SUB_CHOICE_MS;

export function applyPendingSlotActivation(
  state: GameState,
  slotOwnerId: string,
  pending: PendingSlotActivationPayload,
): void {
  if (pending.kind === 'shield') {
    const actor = findPlayer(state, slotOwnerId);

    if (actor === undefined) {
      return;
    }

    actor.shield = pending.isUpgraded ? 7 : 4;
    actor.shieldIsUpgraded = pending.isUpgraded;
    actor.shieldSlotQueuedAt = state.turnSequence;
    return;
  }

  if (pending.kind === 'sentence') {
    startPendingSentence(state, pending.sourcePlayerId, pending.isUpgraded);
    const sentence = state.pendingSentences.findLast(
      (entry) => entry.sourcePlayerId === pending.sourcePlayerId,
    );
    if (sentence !== undefined) {
      sentence.slotQueuedAt = state.turnSequence;
    }
    return;
  }

  activatePersistentEffect({
    state,
    ownerPlayerId: pending.ownerPlayerId,
    cardId: pending.cardId,
    isUpgraded: pending.isUpgraded,
    counter: pending.counter,
    ...(pending.targetPlayerId !== undefined ? { targetPlayerId: pending.targetPlayerId } : {}),
    ...(pending.originalCasterPlayerId !== undefined
      ? { originalCasterPlayerId: pending.originalCasterPlayerId }
      : {}),
  });
}

export function beginSlotDrop(
  state: GameState,
  input: {
    chooserPlayerId: string;
    slotOwnerId: string;
    pending: PendingSlotActivationPayload;
    nowMs: number;
  },
): void {
  const slots = listActiveSlots(state, input.slotOwnerId);

  state.subChoice = {
    kind: 'slot-drop',
    playerId: input.chooserPlayerId,
    slotOwnerId: input.slotOwnerId,
    eligibleSlots: slots.map((slot) => ({
      kind: slot.kind,
      id: slot.id,
      cardId: slot.cardId,
      isUpgraded: slot.isUpgraded,
    })),
    pendingActivation: input.pending,
    deadlineMs: input.nowMs + SLOT_DROP_SUB_CHOICE_MS,
  };
}

export function applySlotDrop(
  state: GameState,
  playerId: string,
  slotId: string,
): { ok: true } | ActionReject {
  const choice = state.subChoice;

  if (choice?.kind !== 'slot-drop' || choice.playerId !== playerId) {
    return actionReject('no-slot-drop-pending');
  }

  const slot = choice.eligibleSlots.find((entry) => entry.id === slotId);

  if (slot === undefined) {
    return actionReject('slot-drop-invalid');
  }

  clearActiveSlot(state, choice.slotOwnerId, {
    ...slot,
    slotQueuedAt: 0,
  });

  applyPendingSlotActivation(state, choice.slotOwnerId, choice.pendingActivation);
  state.subChoice = null;
  return { ok: true };
}

export function applyDefaultSlotDrop(
  state: GameState,
  playerId: string,
): { ok: true } | ActionReject {
  const choice = state.subChoice;

  if (choice?.kind !== 'slot-drop' || choice.playerId !== playerId) {
    return actionReject('no-slot-drop-pending');
  }

  const slots = listActiveSlots(state, choice.slotOwnerId);
  const drop = oldestActiveSlot(slots);

  if (drop === null) {
    return actionReject('slot-drop-invalid');
  }

  return applySlotDrop(state, playerId, drop.id);
}
