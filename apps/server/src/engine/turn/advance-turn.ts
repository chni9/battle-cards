/**
 * Advance to the next non-eliminated player and bump the global turnSequence — L1-04.
 *
 * Walks the full seat order so a player eliminated on their own turn does not
 * incorrectly jump to `alive[0]` (Lot 6).
 *
 * Block consecutive turns (technical spec v4 §4.5): when the player who just
 * finished still has `blockTurnsRemaining > 0`, decrement it, keep the same
 * `currentTurnPlayerId`, still bump `turnSequence`, and reset the ledger. Both
 * `finishTurnPhases` and `resumeAfterRewards` call here — not either alone.
 */

import type { GameState, Player } from '@card-battle/shared';

export function advanceTurn(state: GameState): void {
  const alive = state.players.filter((player) => !player.isEliminated);

  if (alive.length === 0) {
    state.currentTurnPlayerId = null;
    return;
  }

  const currentId = state.currentTurnPlayerId;
  const currentPlayer = currentId === null ? undefined : findPlayer(state, currentId);

  if (
    currentPlayer !== undefined &&
    !currentPlayer.isEliminated &&
    currentPlayer.blockTurnsRemaining > 0
  ) {
    currentPlayer.blockTurnsRemaining -= 1;
    state.turnSequence += 1;
    resetLedger(currentPlayer);
    return;
  }

  const full = state.players;
  let start = full.findIndex((player) => player.id === currentId);

  if (start < 0) {
    start = -1;
  }

  for (let offset = 1; offset <= full.length; offset += 1) {
    const index = (start + offset) % full.length;
    const candidate = full[index];

    if (candidate !== undefined && !candidate.isEliminated) {
      state.currentTurnPlayerId = candidate.id;
      state.turnSequence += 1;
      resetLedger(candidate);
      return;
    }
  }

  state.currentTurnPlayerId = null;
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
