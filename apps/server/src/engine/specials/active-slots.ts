/**
 * Four active-card slots — Lot 69 / rules spec §5.
 */

import type { CardId, GameState } from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';
import { deactivatePersistentEffect } from './deactivate-persistent';

export const MAX_ACTIVE_SLOTS = 4;

export type ActiveSlotKind = 'shield' | 'persistent' | 'sentence';

export interface ActiveSlotRef {
  kind: ActiveSlotKind;
  id: string;
  cardId: CardId;
  isUpgraded: boolean;
  slotQueuedAt: number;
}

/** Curse is not cleared via forced fifth-slot pick (rules spec §5 — Curse end). */
export function isForcedSlotDropEligible(slot: ActiveSlotRef): boolean {
  return !(slot.kind === 'persistent' && slot.cardId === 'curse');
}

export function listForcedSlotDropEligibleSlots(
  state: GameState,
  playerId: string,
): ActiveSlotRef[] {
  return listActiveSlots(state, playerId).filter(isForcedSlotDropEligible);
}

export function listActiveSlots(state: GameState, playerId: string): ActiveSlotRef[] {
  const player = findPlayer(state, playerId);

  if (player === undefined) {
    return [];
  }

  const slots: ActiveSlotRef[] = [];

  if (player.shield > 0) {
    slots.push({
      kind: 'shield',
      id: 'shield',
      cardId: 'shield',
      isUpgraded: player.shieldIsUpgraded,
      slotQueuedAt: player.shieldSlotQueuedAt ?? 0,
    });
  }

  for (const effect of player.activePersistentEffects) {
    slots.push({
      kind: 'persistent',
      id: effect.id,
      cardId: effect.cardId,
      isUpgraded: effect.isUpgraded,
      slotQueuedAt: effect.slotQueuedAt ?? 0,
    });
  }

  for (const sentence of state.pendingSentences) {
    if (sentence.sourcePlayerId !== playerId) {
      continue;
    }

    slots.push({
      kind: 'sentence',
      id: sentence.id,
      cardId: 'sentence',
      isUpgraded: sentence.isUpgraded,
      slotQueuedAt: sentence.slotQueuedAt ?? 0,
    });
  }

  return slots.sort((left, right) => left.slotQueuedAt - right.slotQueuedAt);
}

export function countActiveSlots(state: GameState, playerId: string): number {
  return listActiveSlots(state, playerId).length;
}

export function playAddsActiveSlot(
  state: GameState,
  playerId: string,
  cardId: CardId,
): boolean {
  if (cardId === 'shield') {
    const player = findPlayer(state, playerId);
    return player?.shield === 0;
  }

  if (cardId === 'sentence') {
    return true;
  }

  const persistentIds = [
    'imposition',
    'points-generator',
    'poison',
    'curse',
    'super-absorber',
    'invisibility',
    'roulette',
    'reanimation',
  ] as const;

  if ((persistentIds as readonly string[]).includes(cardId)) {
    if (cardId === 'curse') {
      return true;
    }

    const player = findPlayer(state, playerId);

    if (player === undefined) {
      return false;
    }

    return !player.activePersistentEffects.some((effect) => effect.cardId === cardId);
  }

  return false;
}

export function clearActiveSlot(
  state: GameState,
  playerId: string,
  slot: ActiveSlotRef,
): void {
  const player = findPlayer(state, playerId);

  if (player === undefined) {
    return;
  }

  if (slot.kind === 'shield') {
    player.shield = 0;
    player.shieldIsUpgraded = false;
    delete player.shieldSlotQueuedAt;
    return;
  }

  if (slot.kind === 'sentence') {
    state.pendingSentences = state.pendingSentences.filter((entry) => entry.id !== slot.id);
    return;
  }

  deactivatePersistentEffect(state, playerId, slot.id);
}

export function oldestActiveSlot(slots: readonly ActiveSlotRef[]): ActiveSlotRef | null {
  if (slots.length === 0) {
    return null;
  }

  return slots.reduce<ActiveSlotRef | null>((oldest, slot) => {
    if (oldest === null || slot.slotQueuedAt < oldest.slotQueuedAt) {
      return slot;
    }

    return oldest;
  }, null);
}
