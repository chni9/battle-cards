/**
 * Per-game collector for auto-lost persistents (L56-07).
 *
 * Keyed by `GameState` so concurrent rooms and search clones never mix.
 * Manual `deactivatePersistent` does not record here — that stays `actionPlayed`.
 */

import type { CardId, GameState, PersistentEffect } from '@card-battle/shared';

export interface AutoDeactivation {
  ownerPlayerId: string;
  cardId: CardId;
  isUpgraded: boolean;
}

const logs = new WeakMap<GameState, AutoDeactivation[]>();

export function ensureAutoDeactivationLog(state: GameState): void {
  if (!logs.has(state)) {
    logs.set(state, []);
  }
}

export function recordAutoDeactivation(
  state: GameState,
  ownerPlayerId: string,
  effect: Pick<PersistentEffect, 'cardId' | 'isUpgraded'>,
): void {
  const sink = logs.get(state);

  if (sink === undefined) {
    return;
  }

  sink.push({
    ownerPlayerId,
    cardId: effect.cardId,
    isUpgraded: effect.isUpgraded,
  });
}

export function takeAutoDeactivationLog(state: GameState): AutoDeactivation[] {
  const captured = logs.get(state) ?? [];
  logs.delete(state);
  return captured;
}
