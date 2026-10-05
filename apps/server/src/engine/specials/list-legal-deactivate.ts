/**
 * Manual-deactivate persistent TurnActions — L25-02 / Lot 69.
 *
 * Any persistent special on the actor (including Curse on them). Shield and Sentence
 * are not hand-deactivated.
 */

import {
  actionReject,
  type ActionReject,
  type CardId,
  type GameState,
  type Player,
} from '@card-battle/shared';

import { deactivatePersistentEffect } from '../specials/deactivate-persistent';
import type { TurnAction } from '../turn/perform-action';

export function isManualDeactivateCardId(): boolean {
  return true;
}

export function listLegalDeactivateActions(actor: Player): readonly TurnAction[] {
  const actions: TurnAction[] = [];

  for (const effect of actor.activePersistentEffects) {
    actions.push({ type: 'deactivatePersistent', effectId: effect.id });
  }

  return actions;
}

export function deactivatePersistentAction(
  state: GameState,
  actorPlayerId: string,
  effectId: string,
): { ok: true; cardId: CardId; isUpgraded: boolean } | ActionReject {
  const actor = state.players.find((player) => player.id === actorPlayerId);

  if (actor === undefined) {
    return actionReject('unknown-player');
  }

  const effect = actor.activePersistentEffects.find((entry) => entry.id === effectId);

  if (effect === undefined) {
    return actionReject('persistent-not-active');
  }

  const cardId = effect.cardId;

  if (deactivatePersistentEffect(state, actorPlayerId, effectId) === null) {
    return actionReject('persistent-not-active');
  }

  return { ok: true, cardId, isUpgraded: effect.isUpgraded };
}
