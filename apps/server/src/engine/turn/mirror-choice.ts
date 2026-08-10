/**
 * Mirror redirect helpers — rules spec §3, technical spec §5.5–5.6, backlog L3-09.
 */

import {
  actionReject,
  type ActionReject,
  isAttackCardId,
  type CardId,
  type GameState,
  type PendingEffect,
  type Player,
} from '@card-battle/shared';

import type { Rng } from '../rng';
import { findPlayer } from './advance-turn';
import { SUB_CHOICE_MS } from './sub-choice';

/** Re-exports the single `SUB_CHOICE_MS` — technical spec v4 §4.4 (L20-18). */
export const MIRROR_SUB_CHOICE_MS = SUB_CHOICE_MS;

export interface MirrorRedirectInfo {
  actorPlayerId: string;
  cardId: CardId;
  previousTargetPlayerId: string;
  newTargetPlayerId: string;
}

export function listEligibleMirrorTargets(
  player: Player,
  isUpgradedMirror: boolean,
): PendingEffect[] {
  return [...player.pendingEffects]
    .filter((effect) => {
      if (!isAttackCardId(effect.cardId)) {
        return false;
      }

      if (!isUpgradedMirror && effect.isUpgraded) {
        return false;
      }

      // Super-mirror redirects are ineligible for Mirror (regular or upgraded).
      if (effect.redirectedBy === 'super-mirror') {
        return false;
      }

      // MEGA ATTACK redirection — technical spec v4 §4.7.
      if (effect.cardId === 'mega-attack') {
        if (effect.isUpgraded) {
          return false;
        }
        if (!isUpgradedMirror) {
          return false;
        }
      }

      return true;
    })
    .sort((left, right) => left.queuedAt - right.queuedAt);
}

/**
 * Super Mirror eligibility — rules spec §5, backlog L23-02 / #V4-4.
 * Every pending attack on the user, including upgraded MEGA and prior Super Mirror
 * redirects (another Super Mirror may re-redirect them).
 */
export function listEligibleSuperMirrorTargets(player: Player): PendingEffect[] {
  return [...player.pendingEffects]
    .filter((effect) => isAttackCardId(effect.cardId))
    .sort((left, right) => left.queuedAt - right.queuedAt);
}

export function redirectPendingAttack(
  state: GameState,
  owner: Player,
  effectId: string,
  newTargetPlayerId: string,
  doubleDamage: boolean,
): { ok: true; redirect: MirrorRedirectInfo } | ActionReject {
  if (newTargetPlayerId === owner.id) {
    return actionReject('invalid-mirror-target');
  }

  const newTarget = findPlayer(state, newTargetPlayerId);

  if (newTarget === undefined || newTarget.isEliminated) {
    return actionReject('invalid-mirror-target');
  }

  const index = owner.pendingEffects.findIndex((effect) => effect.id === effectId);

  if (index < 0) {
    return actionReject('pending-attack-unavailable');
  }

  const [effect] = owner.pendingEffects.splice(index, 1);

  if (effect === undefined || !isAttackCardId(effect.cardId)) {
    return actionReject('pending-attack-unavailable');
  }

  const previousTargetPlayerId = effect.targetPlayerId;
  // A redirected attack is an attack from the Mirror user (rules spec §6) — attribution
  // and mutual pairing use this source, not the original attacker.
  effect.sourcePlayerId = owner.id;
  effect.targetPlayerId = newTargetPlayerId;
  effect.redirectedBy = 'mirror';

  if (doubleDamage) {
    effect.damageMultiplier *= 2;
  }

  newTarget.pendingEffects.push(effect);
  return {
    ok: true,
    redirect: {
      actorPlayerId: owner.id,
      cardId: effect.cardId,
      previousTargetPlayerId,
      newTargetPlayerId,
    },
  };
}

export function applyDefaultMirrorRedirect(
  state: GameState,
  rng: Rng,
): { ok: true; redirect: MirrorRedirectInfo } | ActionReject {
  const choice = state.mirrorChoice;

  if (choice === null) {
    return actionReject('no-mirror-choice-pending');
  }

  const owner = findPlayer(state, choice.playerId);

  if (owner === undefined) {
    return actionReject('unknown-player');
  }

  const eligible = listEligibleMirrorTargets(owner, choice.isUpgraded).filter((effect) =>
    choice.eligibleEffectIds.includes(effect.id),
  );
  const first = eligible[0];

  if (first === undefined) {
    return actionReject('nothing-left-to-redirect');
  }

  const opponents = state.players.filter(
    (player) => player.id !== owner.id && !player.isEliminated,
  );

  if (opponents.length === 0) {
    return actionReject('no-opponent-to-redirect');
  }

  const newTarget = rng.pick(opponents);
  return redirectPendingAttack(state, owner, first.id, newTarget.id, choice.isUpgraded);
}
