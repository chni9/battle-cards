/**
 * Presentation-only chips for turn-step persistents (Imposition / Points Generator).
 * These do not enter the engine pending queue — they tick in applyPersistentEffects.
 * Chips mirror PendingEffectView so PendingQueue can render them.
 */

import type { PendingEffectView, PlayingStateView } from '@card-battle/shared';

/** Stable synthetic queuedAt so chips sort after real pending (queuedAt is ascending). */
const SYNTHETIC_QUEUED_AT = 1_000_000;

/**
 * Effects that will tick against `you` on your turn after you act:
 * - Imposition owned by another seat
 * - Points Generator you own (self tick)
 */
export function buildPersistentIncomingChips(
  view: PlayingStateView,
): PendingEffectView[] {
  const chips: PendingEffectView[] = [];

  for (const player of view.players) {
    if (player.isEliminated) {
      continue;
    }

    for (const effect of player.activePersistentEffects) {
      if (effect.counter !== null && effect.counter <= 0) {
        continue;
      }

      if (effect.cardId === 'imposition' && player.id !== view.you) {
        chips.push({
          id: `persistent:${effect.id}->${view.you}`,
          sourcePlayerId: player.id,
          targetPlayerId: view.you,
          cardId: effect.cardId,
          isUpgraded: effect.isUpgraded,
          queuedAt: SYNTHETIC_QUEUED_AT,
          damageMultiplier: 1,
          redirectedBy: null,
        });
      }

      // Victim-owned Curse ticks on your turn after you act (designer 2026-08-07).
      if (effect.cardId === 'curse' && player.id === view.you) {
        chips.push({
          id: `persistent:${effect.id}->${view.you}`,
          sourcePlayerId: view.you,
          targetPlayerId: view.you,
          cardId: effect.cardId,
          isUpgraded: effect.isUpgraded,
          queuedAt: SYNTHETIC_QUEUED_AT,
          damageMultiplier: 1,
          redirectedBy: null,
        });
      }

      if (effect.cardId === 'points-generator' && player.id === view.you) {
        chips.push({
          id: `persistent:${effect.id}->${view.you}`,
          sourcePlayerId: view.you,
          targetPlayerId: view.you,
          cardId: effect.cardId,
          isUpgraded: effect.isUpgraded,
          queuedAt: SYNTHETIC_QUEUED_AT,
          damageMultiplier: 1,
          redirectedBy: null,
        });
      }
    }
  }

  return chips;
}

/**
 * Own Imposition shown on the felt strip as one chip per living opponent.
 */
export function buildPersistentOthersChips(
  view: PlayingStateView,
): PendingEffectView[] {
  const chips: PendingEffectView[] = [];
  const self = view.players.find((player) => player.id === view.you);
  if (self === undefined) {
    return chips;
  }

  for (const effect of self.activePersistentEffects) {
    if (effect.cardId !== 'imposition') {
      continue;
    }
    if (effect.counter !== null && effect.counter <= 0) {
      continue;
    }

    for (const player of view.players) {
      if (player.isYou || player.isEliminated) {
        continue;
      }
      chips.push({
        id: `persistent:${effect.id}->${player.id}`,
        sourcePlayerId: view.you,
        targetPlayerId: player.id,
        cardId: effect.cardId,
        isUpgraded: effect.isUpgraded,
        queuedAt: SYNTHETIC_QUEUED_AT,
        damageMultiplier: 1,
        redirectedBy: null,
      });
    }
  }

  return chips;
}
