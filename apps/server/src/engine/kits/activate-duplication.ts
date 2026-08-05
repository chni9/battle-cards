/**
 * Activate Duplicator TurnAction — rules spec §4, L28-02.
 *
 * Replaces the turn's action; sets `duplicationActive` for the following table
 * round (cleared at the start of this player's next turn in `advanceTurn`).
 */

import type { GameState } from '@card-battle/shared';

import type { TurnAction } from '../turn/perform-action';

export function listLegalActivateDuplicationActions(
  actor: { kitId: string },
): readonly TurnAction[] {
  if (actor.kitId !== 'duplicator') {
    return [];
  }

  return [{ type: 'activateDuplication' }];
}

export function activateDuplicationAction(
  state: GameState,
  actorPlayerId: string,
): { ok: true } | { ok: false; message: string } {
  const actor = state.players.find((player) => player.id === actorPlayerId);

  if (actor === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  if (actor.kitId !== 'duplicator') {
    return { ok: false, message: 'Only the Duplicator kit can activate duplication.' };
  }

  actor.duplicationActive = true;
  return { ok: true };
}
