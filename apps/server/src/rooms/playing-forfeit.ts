/**
 * Playing-phase FORFEIT — technical spec v6 §6.3 / L43-06.
 * Same elim as consented leave (`eliminateWithoutReward` + leave reason);
 * the room keeps the live socket (no `leave`, no reject on the forfeiter).
 */

import type { GameState } from '@card-battle/shared';

import {
  eliminateWithoutReward,
  findSoleSurvivorId,
  type PersistentDeactivation,
} from '../engine/turn/elimination-rewards';

export interface PlayingForfeitResult {
  eliminated: boolean;
  soleSurvivorId: string | null;
  persistentDeactivations: readonly PersistentDeactivation[];
}

export function applyPlayingForfeit(
  state: GameState,
  playerId: string,
): PlayingForfeitResult {
  const result = eliminateWithoutReward(state, playerId);

  if (!result.eliminated) {
    return {
      eliminated: false,
      soleSurvivorId: null,
      persistentDeactivations: [],
    };
  }

  return {
    eliminated: true,
    soleSurvivorId: findSoleSurvivorId(state),
    persistentDeactivations: result.persistentDeactivations,
  };
}
