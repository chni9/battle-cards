/**
 * Post-elimination Absorber window — designer 2026-08-07.
 *
 * After elimination, the corpse stays Absorber-targetable (and Super Absorber
 * activation-absorbable) until every player who was living at that elimination
 * has finished one turn (through their action). Mid-window deaths prune the
 * pending set so windows cannot stick forever.
 */

import type { GameState, Player } from '@card-battle/shared';

export function isAbsorbWindowOpen(player: Player): boolean {
  const pending = player.absorbWindowPendingPlayerIds;
  return pending !== null && pending.length > 0;
}

/** Living players are always targets; corpses only while their window is open. */
export function isAbsorberTargetable(target: Player): boolean {
  return !target.isEliminated || isAbsorbWindowOpen(target);
}

function closeAbsorbWindow(player: Player): void {
  player.absorbWindowPendingPlayerIds = null;
  player.turnLedger = {
    livesLost: 0,
    pointsSpent: 0,
    upgradePointsSpent: 0,
    pointsLostToTheft: 0,
    upgradePointsLostToTheft: 0,
  };
}

function removeFromPending(player: Player, playerId: string): void {
  const pending = player.absorbWindowPendingPlayerIds;

  if (pending === null) {
    return;
  }

  const next = pending.filter((id) => id !== playerId);

  if (next.length === 0) {
    closeAbsorbWindow(player);
    return;
  }

  player.absorbWindowPendingPlayerIds = next;
}

/**
 * Call after `victim.isEliminated = true`. Opens the victim's window and removes
 * them from every other corpse's pending set (they will never begin another turn).
 */
export function onPlayerEliminatedForAbsorbWindow(state: GameState, victim: Player): void {
  for (const player of state.players) {
    if (player.id === victim.id) {
      continue;
    }

    removeFromPending(player, victim.id);
  }

  const livingIds = state.players
    .filter((player) => player.id !== victim.id && !player.isEliminated)
    .map((player) => player.id);

  if (livingIds.length === 0) {
    victim.absorbWindowPendingPlayerIds = null;
    return;
  }

  victim.absorbWindowPendingPlayerIds = livingIds;
}

/**
 * Call when a seat finishes a turn (`advanceTurn`), after they have acted.
 * The player who is about to act is still in the pending set.
 */
export function tickAbsorbWindowsOnEndTurn(state: GameState, finishedPlayerId: string): void {
  for (const player of state.players) {
    removeFromPending(player, finishedPlayerId);
  }
}

export function clearAbsorbWindow(player: Player): void {
  player.absorbWindowPendingPlayerIds = null;
}
