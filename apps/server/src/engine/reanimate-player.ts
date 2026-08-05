/**
 * Reanimation restart — rules spec §5, #V4-36 / L26-01.
 *
 * Extracts the deal path from `create-initial-state`'s private `makePlayer`:
 * full setup steps 2 + 3 + 4 for the new kit. Preserves identity and connection;
 * clears elimination / pending-revive / snapshot so a later death captures fresh.
 */

import {
  ACTION_CARD_IDS,
  ATTACK_CARD_IDS,
  getKit,
  KIT_IDS,
  SPECIAL_CARD_IDS,
  type KitId,
  type Player,
} from '@card-battle/shared';

import { acquireCardToHand, acquireSpecialCard } from './kits/acquire-card';
import type { Rng } from './rng';

export function pickReanimationKit(rng: Rng, forcedKitId?: KitId): KitId {
  return forcedKitId ?? rng.pick(KIT_IDS);
}

/**
 * Deal starting attack/action draws and kit specials (setup steps 3–4).
 * Caller sets resources (step 2) and clears zones first when resetting.
 *
 * Prophet (#V4-27 / L27-04): `randomStartingSpecialCount` draws from all 20
 * specials via seeded `rng.pick` with replacement (duplicates OK).
 */
export function dealStartingLoadout(
  player: Player,
  kitId: KitId,
  rng: Rng,
  instancePrefix: string,
): void {
  const kit = getKit(kitId);

  for (let index = 0; index < kit.startingCardCounts.action; index += 1) {
    const cardId = rng.pick(ACTION_CARD_IDS);
    acquireCardToHand(player, cardId, `${instancePrefix}:action:${String(index)}`);
  }

  for (let index = 0; index < kit.startingCardCounts.attack; index += 1) {
    const cardId = rng.pick(ATTACK_CARD_IDS);
    acquireCardToHand(player, cardId, `${instancePrefix}:attack:${String(index)}`);
  }

  const randomCount = kit.randomStartingSpecialCount;

  if (randomCount !== undefined && randomCount > 0) {
    for (let index = 0; index < randomCount; index += 1) {
      const specialId = rng.pick(SPECIAL_CARD_IDS);
      acquireSpecialCard(player, specialId, `${instancePrefix}:special:${String(index)}`);
    }
    return;
  }

  for (const [index, specialId] of kit.specialCards.entries()) {
    acquireSpecialCard(player, specialId, `${instancePrefix}:special:${String(index)}`);
  }
}

/**
 * Reset an eliminated player into a fresh kit loadout (#V4-36).
 * Caller must already have dumped leftovers to the pool and consumed the charge.
 */
export function reanimatePlayer(player: Player, kitId: KitId, rng: Rng): void {
  const kit = getKit(kitId);

  player.kitId = kitId;
  player.lives = kit.startingResources.lives;
  player.points = kit.startingResources.points;
  player.upgradePoints = kit.startingResources.upgradePoints;
  player.shield = 0;
  player.shieldIsUpgraded = false;
  player.hand = [];
  player.specialCards = [];
  player.pendingEffects = [];
  player.activePersistentEffects = [];
  player.turnLedger = {
    livesLost: 0,
    pointsSpent: 0,
    upgradePointsSpent: 0,
    pointsLostToTheft: 0,
    upgradePointsLostToTheft: 0,
  };
  player.isEliminated = false;
  player.blockTurnsRemaining = 0;
  player.blockAttacksForbidden = false;
  player.attackBlockCharges = 0;
  player.duplicationActive = false;
  player.eliminationSnapshot = null;
  player.pendingReanimation = null;

  dealStartingLoadout(player, kitId, rng, `${player.id}:reanim`);
}
