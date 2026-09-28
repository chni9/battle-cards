/**
 * Spend 1 upgrade point to permanently upgrade one held copy, one legal active
 * persistent, or the actor's ticking Sentence — rules spec §1, designer 2026-09-28.
 *
 * Active upgrade does not reset counters or Sentence remaining turns. The
 * upgraded rate applies from the next tick. Sentence only flips `isUpgraded`.
 *
 * `alwaysUpgraded` kit trait is applied at acquisition (`acquireCardToHand`), not here.
 */

import {
  actionReject,
  isUpgradeableActiveCardId,
  type ActionReject,
  type CardId,
  type GameState,
} from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';
import { recordChosenUpgradePointsSpent } from './record-chosen-spend';

export type UpgradeCardResult =
  | { ok: true; cardId: CardId }
  | ActionReject;

export function upgradeCard(
  state: GameState,
  actorPlayerId: string,
  instanceId: string,
): UpgradeCardResult {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return actionReject('unknown-player');
  }

  if (actor.upgradePoints < 1) {
    return actionReject('not-enough-upgrade-points');
  }

  const instance =
    actor.hand.find((card) => card.instanceId === instanceId) ??
    actor.specialCards.find((card) => card.instanceId === instanceId);

  if (instance !== undefined) {
    if (instance.isUpgraded) {
      return actionReject('already-upgraded');
    }

    actor.upgradePoints -= 1;
    recordChosenUpgradePointsSpent(actor, 1);
    instance.isUpgraded = true;

    return { ok: true, cardId: instance.cardId };
  }

  const persistent = actor.activePersistentEffects.find((effect) => effect.id === instanceId);

  if (persistent !== undefined) {
    if (!isUpgradeableActiveCardId(persistent.cardId)) {
      return actionReject('card-not-held');
    }

    if (persistent.isUpgraded) {
      return actionReject('already-upgraded');
    }

    actor.upgradePoints -= 1;
    recordChosenUpgradePointsSpent(actor, 1);
    persistent.isUpgraded = true;

    return { ok: true, cardId: persistent.cardId };
  }

  const sentence = state.pendingSentences.find((entry) => entry.id === instanceId);

  if (sentence?.sourcePlayerId === actorPlayerId) {
    if (sentence.isUpgraded) {
      return actionReject('already-upgraded');
    }

    actor.upgradePoints -= 1;
    recordChosenUpgradePointsSpent(actor, 1);
    sentence.isUpgraded = true;

    return { ok: true, cardId: 'sentence' };
  }

  return actionReject('card-not-held');
}
