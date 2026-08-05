/**
 * Generic `GameState.subChoice` helpers — pool-pick (L24-01) and special-pick (L24-02).
 *
 * Approach B: new Mirror-shaped kinds share one field rather than dedicated slots.
 * Defaults use the injected `rng` (AGENTS golden rule 5).
 */

import {
  KIT_IDS,
  SPECIAL_CARD_IDS,
  type GameState,
  type KitId,
  type SpecialCardId,
} from '@card-battle/shared';

import { acquireSpecialCard, transferCardInstance } from '../kits/acquire-card';
import { takeFromPool } from '../pool/take-from-pool';
import { pickReanimationKit, reanimatePlayer } from '../reanimate-player';
import type { Rng } from '../rng';
import { findPlayer } from './advance-turn';
import { SUB_CHOICE_MS } from './sub-choice';

export const CARD_ABSORBER_BASE_MAX = 4;
/** Upgraded Card Absorber choose-count — designer ruling 2026-08-05 (session). */
export const CARD_ABSORBER_UPGRADED_MAX = 8;

/** Re-export the single `SUB_CHOICE_MS` — technical spec v4 §4.4. */
export const POOL_SUB_CHOICE_MS = SUB_CHOICE_MS;
export const SPECIAL_SUB_CHOICE_MS = SUB_CHOICE_MS;

export function recoverCardsFromPool(
  state: GameState,
  playerId: string,
  instanceIds: readonly string[],
): void {
  const player = findPlayer(state, playerId);

  if (player === undefined) {
    return;
  }

  for (const instanceId of instanceIds) {
    const taken = takeFromPool(state, instanceId);

    if (taken !== undefined) {
      transferCardInstance(player, taken);
    }
  }
}

export function pickRandomPoolInstanceIds(
  eligibleInstanceIds: readonly string[],
  count: number,
  rng: Rng,
): string[] {
  if (count <= 0 || eligibleInstanceIds.length === 0) {
    return [];
  }

  return rng.shuffle(eligibleInstanceIds).slice(0, Math.min(count, eligibleInstanceIds.length));
}

export function beginPoolPick(
  state: GameState,
  input: {
    playerId: string;
    cardIsUpgraded: boolean;
    nowMs: number;
  },
): void {
  const eligibleInstanceIds = state.pool.map((card) => card.instanceId);
  const maxCount = Math.min(CARD_ABSORBER_UPGRADED_MAX, eligibleInstanceIds.length);

  if (maxCount === 0) {
    return;
  }

  state.subChoice = {
    kind: 'pool-pick',
    playerId: input.playerId,
    maxCount,
    eligibleInstanceIds,
    cardIsUpgraded: input.cardIsUpgraded,
    deadlineMs: input.nowMs + POOL_SUB_CHOICE_MS,
  };
}

export function applyPoolPick(
  state: GameState,
  instanceIds: readonly string[],
): { ok: true } | { ok: false; message: string } {
  const choice = state.subChoice;

  if (choice?.kind !== 'pool-pick') {
    return { ok: false, message: 'No pool pick pending.' };
  }

  if (instanceIds.length !== choice.maxCount) {
    return {
      ok: false,
      message: `Choose exactly ${String(choice.maxCount)} card(s) from the pool.`,
    };
  }

  const unique = new Set(instanceIds);

  if (unique.size !== instanceIds.length) {
    return { ok: false, message: 'Duplicate pool picks are not allowed.' };
  }

  for (const instanceId of instanceIds) {
    if (!choice.eligibleInstanceIds.includes(instanceId)) {
      return { ok: false, message: 'That card is not available in the pool.' };
    }

    if (!state.pool.some((card) => card.instanceId === instanceId)) {
      return { ok: false, message: 'That card is no longer in the pool.' };
    }
  }

  recoverCardsFromPool(state, choice.playerId, instanceIds);
  state.subChoice = null;
  return { ok: true };
}

export function applyDefaultPoolPick(
  state: GameState,
  rng: Rng,
): { ok: true } | { ok: false; message: string } {
  const choice = state.subChoice;

  if (choice?.kind !== 'pool-pick') {
    return { ok: false, message: 'No pool pick pending.' };
  }

  const picked = pickRandomPoolInstanceIds(
    choice.eligibleInstanceIds.filter((id) =>
      state.pool.some((card) => card.instanceId === id),
    ),
    choice.maxCount,
    rng,
  );

  return applyPoolPick(state, picked);
}

export function beginSpecialPick(
  state: GameState,
  input: {
    playerId: string;
    nowMs: number;
  },
): void {
  state.subChoice = {
    kind: 'special-pick',
    playerId: input.playerId,
    eligibleCardIds: [...SPECIAL_CARD_IDS],
    deadlineMs: input.nowMs + SPECIAL_SUB_CHOICE_MS,
  };
}

export function grantTransformedSpecial(
  state: GameState,
  playerId: string,
  cardId: SpecialCardId,
): void {
  const player = findPlayer(state, playerId);

  if (player === undefined) {
    return;
  }

  acquireSpecialCard(
    player,
    cardId,
    `${playerId}:xform:${String(state.turnSequence)}:${cardId}:${String(player.specialCards.length)}`,
  );
}

export function applySpecialPick(
  state: GameState,
  cardId: SpecialCardId,
): { ok: true } | { ok: false; message: string } {
  const choice = state.subChoice;

  if (choice?.kind !== 'special-pick') {
    return { ok: false, message: 'No special pick pending.' };
  }

  if (!choice.eligibleCardIds.includes(cardId)) {
    return { ok: false, message: 'That special is not available.' };
  }

  grantTransformedSpecial(state, choice.playerId, cardId);
  state.subChoice = null;
  return { ok: true };
}

export function applyDefaultSpecialPick(
  state: GameState,
  rng: Rng,
): { ok: true } | { ok: false; message: string } {
  const choice = state.subChoice;

  if (choice?.kind !== 'special-pick') {
    return { ok: false, message: 'No special pick pending.' };
  }

  const cardId = rng.pick(choice.eligibleCardIds);
  return applySpecialPick(state, cardId);
}

export const REANIMATION_KIT_SUB_CHOICE_MS = SUB_CHOICE_MS;

export function beginReanimationKitPick(
  state: GameState,
  input: {
    playerId: string;
    nowMs: number;
  },
): void {
  state.subChoice = {
    kind: 'reanimation-kit',
    playerId: input.playerId,
    eligibleKitIds: [...KIT_IDS],
    deadlineMs: input.nowMs + REANIMATION_KIT_SUB_CHOICE_MS,
  };
}

export function applyReanimationKitPick(
  state: GameState,
  kitId: KitId,
  rng: Rng,
): { ok: true; playerReanimated: { playerId: string; kitId: KitId } } | { ok: false; message: string } {
  const choice = state.subChoice;

  if (choice?.kind !== 'reanimation-kit') {
    return { ok: false, message: 'No reanimation kit pick pending.' };
  }

  if (!choice.eligibleKitIds.includes(kitId)) {
    return { ok: false, message: 'That kit is not available.' };
  }

  const player = findPlayer(state, choice.playerId);

  if (player?.pendingReanimation == null) {
    state.subChoice = null;
    return { ok: false, message: 'No pending reanimation.' };
  }

  state.subChoice = null;
  reanimatePlayer(player, kitId, rng);
  return { ok: true, playerReanimated: { playerId: player.id, kitId } };
}

export function applyDefaultReanimationKitPick(
  state: GameState,
  rng: Rng,
):
  | { ok: true; playerReanimated: { playerId: string; kitId: KitId } }
  | { ok: false; message: string } {
  const choice = state.subChoice;

  if (choice?.kind !== 'reanimation-kit') {
    return { ok: false, message: 'No reanimation kit pick pending.' };
  }

  const kitId = pickReanimationKit(rng);
  return applyReanimationKitPick(state, kitId, rng);
}
