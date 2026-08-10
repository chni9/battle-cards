/**
 * Manual-deactivate persistent TurnActions — L25-02 / #V4-10.
 *
 * Only `invisibility` is deactivatable today; L28-02 may widen the set.
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

export const MANUAL_DEACTIVATE_CARD_IDS = ['invisibility'] as const satisfies readonly CardId[];

const MANUAL_SET = new Set<string>(MANUAL_DEACTIVATE_CARD_IDS);

export function isManualDeactivateCardId(cardId: string): boolean {
  return MANUAL_SET.has(cardId);
}

export function listLegalDeactivateActions(actor: Player): readonly TurnAction[] {
  const actions: TurnAction[] = [];

  for (const effect of actor.activePersistentEffects) {
    if (!isManualDeactivateCardId(effect.cardId)) {
      continue;
    }

    actions.push({ type: 'deactivatePersistent', effectId: effect.id });
  }

  return actions;
}

export function deactivatePersistentAction(
  state: GameState,
  actorPlayerId: string,
  effectId: string,
): { ok: true; cardId: CardId } | ActionReject {
  const actor = state.players.find((player) => player.id === actorPlayerId);

  if (actor === undefined) {
    return actionReject('unknown-player');
  }

  const effect = actor.activePersistentEffects.find((entry) => entry.id === effectId);

  if (effect === undefined) {
    return actionReject('persistent-not-active');
  }

  if (!isManualDeactivateCardId(effect.cardId)) {
    return actionReject('persistent-not-manual');
  }

  const cardId = effect.cardId;

  if (!deactivatePersistentEffect(state, actorPlayerId, effectId)) {
    return actionReject('persistent-not-active');
  }

  return { ok: true, cardId };
}
