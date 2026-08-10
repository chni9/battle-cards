/**
 * Activate Duplicator TurnAction — rules spec §4, L28-02.
 *
 * Replaces the turn's action; sets `duplicationActive` for the following table
 * round (cleared at the start of this player's next turn in `advanceTurn`).
 */

import {
  actionReject,
  type ActionReject,
  type GameState,
} from '@card-battle/shared';

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
): { ok: true } | ActionReject {
  const actor = state.players.find((player) => player.id === actorPlayerId);

  if (actor === undefined) {
    return actionReject('unknown-player');
  }

  if (actor.kitId !== 'duplicator') {
    return actionReject('duplicator-kit-required');
  }

  actor.duplicationActive = true;
  return { ok: true };
}
