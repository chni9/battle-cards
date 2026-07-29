/**
 * Advance to the next non-eliminated player and bump the global turnSequence — L1-04.
 */

import type { GameState, Player } from '@card-battle/shared';

export function advanceTurn(state: GameState): void {
  const alive = state.players.filter((player) => !player.isEliminated);

  if (alive.length === 0) {
    state.currentTurnPlayerId = null;
    return;
  }

  const currentId = state.currentTurnPlayerId;
  const currentIndex = alive.findIndex((player) => player.id === currentId);
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % alive.length;
  const next = alive[nextIndex];

  if (next === undefined) {
    state.currentTurnPlayerId = null;
    return;
  }

  state.currentTurnPlayerId = next.id;
  state.turnSequence += 1;
  resetLedger(next);
}

function resetLedger(player: Player): void {
  player.turnLedger = {
    livesLost: 0,
    pointsSpent: 0,
    upgradePointsSpent: 0,
    pointsLostToTheft: 0,
    upgradePointsLostToTheft: 0,
  };
}

export function findPlayer(state: GameState, playerId: string): Player | undefined {
  return state.players.find((player) => player.id === playerId);
}
