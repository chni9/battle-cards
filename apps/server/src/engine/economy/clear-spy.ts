/**
 * Unspy — pay `CLEAR_SPY_COST` to drop one living opponent's Spy on you.
 * Rules spec §3, L58-07. Consumes the turn. Overlay vision is not a row.
 */

import {
  actionReject,
  CLEAR_SPY_COST,
  type ActionReject,
  type GameState,
} from '@card-battle/shared';

import { findSpyRelation, revokeSpy } from '../../protocol/visibility-matrix';
import { findPlayer } from '../turn/advance-turn';
import { payCost } from './transfers';

export type ClearSpyResult = { ok: true } | ActionReject;

export function clearSpy(
  state: GameState,
  actorPlayerId: string,
  targetPlayerId: string,
): ClearSpyResult {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return actionReject('unknown-player');
  }

  if (targetPlayerId === actorPlayerId) {
    return actionReject('not-spying-you');
  }

  const target = findPlayer(state, targetPlayerId);

  if (target === undefined || target.isEliminated) {
    return actionReject('not-spying-you');
  }

  if (findSpyRelation(state, targetPlayerId, actorPlayerId) === undefined) {
    return actionReject('not-spying-you');
  }

  const paid = payCost(state, actor, { points: CLEAR_SPY_COST });

  if (!paid.ok) {
    return paid;
  }

  revokeSpy(state, targetPlayerId, actorPlayerId);
  return { ok: true };
}
