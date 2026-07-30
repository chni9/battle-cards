/**
 * Spend 1 upgrade point to permanently upgrade one held copy — rules spec §1, L2-03.
 *
 * `alwaysUpgraded` kit trait (Lot 4) is not applied here — acquisition-time only.
 */

import type { CardId, GameState } from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';

export type UpgradeCardResult =
  | { ok: true; cardId: CardId }
  | { ok: false; message: string };

export function upgradeCard(
  state: GameState,
  actorPlayerId: string,
  instanceId: string,
): UpgradeCardResult {
  const actor = findPlayer(state, actorPlayerId);

  if (actor === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  if (actor.upgradePoints < 1) {
    return { ok: false, message: 'Not enough upgrade points.' };
  }

  const instance = actor.hand.find((card) => card.instanceId === instanceId);

  if (instance === undefined) {
    return { ok: false, message: 'You do not hold that card.' };
  }

  if (instance.isUpgraded) {
    return { ok: false, message: 'That copy is already upgraded.' };
  }

  actor.upgradePoints -= 1;
  actor.turnLedger.upgradePointsSpent += 1;
  instance.isUpgraded = true;

  return { ok: true, cardId: instance.cardId };
}
