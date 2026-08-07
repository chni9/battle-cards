/**
 * Pass Curse persistents after a successful attack — rules spec §5, L32-01.
 *
 * When the attacker deals ≥1 life with any attack card, every Curse on the
 * attacker moves onto the hit player (same instance; upgraded flag kept).
 */

import type { GameState, PersistentEffect } from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';

export interface CurseTransfer {
  effectId: string;
  isUpgraded: boolean;
  fromPlayerId: string;
  toPlayerId: string;
}

/**
 * Move all Curse effects from `fromPlayerId` onto `toPlayerId`.
 * No-op when the seats are the same, unknown, or the source has no Curse.
 */
export function transferCursesFromAttacker(
  state: GameState,
  fromPlayerId: string,
  toPlayerId: string,
): CurseTransfer[] {
  if (fromPlayerId === toPlayerId) {
    return [];
  }

  const from = findPlayer(state, fromPlayerId);
  const to = findPlayer(state, toPlayerId);

  if (from === undefined || to === undefined || to.isEliminated) {
    return [];
  }

  const moved: PersistentEffect[] = [];
  const remaining: PersistentEffect[] = [];

  for (const effect of from.activePersistentEffects) {
    if (effect.cardId === 'curse') {
      moved.push(effect);
    } else {
      remaining.push(effect);
    }
  }

  if (moved.length === 0) {
    return [];
  }

  from.activePersistentEffects = remaining;
  to.activePersistentEffects.push(...moved);

  return moved.map((effect) => ({
    effectId: effect.id,
    isUpgraded: effect.isUpgraded,
    fromPlayerId,
    toPlayerId,
  }));
}
