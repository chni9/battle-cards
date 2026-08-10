/**
 * Spend 1 upgrade point to permanently upgrade one held copy — rules spec §1, L2-03.
 *
 * `alwaysUpgraded` kit trait is applied at acquisition (`acquireCardToHand`), not here.
 */

import {
  actionReject,
  type ActionReject,
  type CardId,
  type GameState,
} from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';

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

  if (instance === undefined) {
    return actionReject('card-not-held');
  }

  if (instance.isUpgraded) {
    return actionReject('already-upgraded');
  }

  actor.upgradePoints -= 1;
  actor.turnLedger.upgradePointsSpent += 1;
  instance.isUpgraded = true;

  return { ok: true, cardId: instance.cardId };
}
