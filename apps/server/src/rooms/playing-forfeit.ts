/**
 * Playing-phase FORFEIT — technical spec v6 §6.3 / L43-06, Lot 71.
 * Same elim as consented leave (`eliminateForForfeit` + leave reason);
 * the room keeps the live socket (no `leave`, no reject on the forfeiter).
 * Queued attackers pick before cards hit the pool. Active Poison does not pay.
 */

import type { GameState } from '@card-battle/shared';

import {
  eliminateForForfeit,
  findSoleSurvivorId,
  type PersistentDeactivation,
} from '../engine/turn/elimination-rewards';

export interface PlayingForfeitResult {
  eliminated: boolean;
  soleSurvivorId: string | null;
  persistentDeactivations: readonly PersistentDeactivation[];
  rewardChoicePending: boolean;
}

export function applyPlayingForfeit(
  state: GameState,
  playerId: string,
): PlayingForfeitResult {
  const result = eliminateForForfeit(state, playerId);

  if (!result.eliminated) {
    return {
      eliminated: false,
      soleSurvivorId: null,
      persistentDeactivations: [],
      rewardChoicePending: false,
    };
  }

  return {
    eliminated: true,
    soleSurvivorId: findSoleSurvivorId(state),
    persistentDeactivations: result.persistentDeactivations,
    rewardChoicePending: result.rewardChoicePending,
  };
}
