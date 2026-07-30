/**
 * Mirror redirect helpers — rules spec §3, technical spec §5.5–5.6, backlog L3-09.
 */

import {
  ATTACK_CARD_IDS,
  type AttackCardId,
  type GameState,
  type PendingEffect,
  type Player,
} from '@card-battle/shared';

import type { Rng } from '../rng';
import { findPlayer } from './advance-turn';

export const MIRROR_SUB_CHOICE_MS = 20_000;

function isAttackCardId(cardId: string): cardId is AttackCardId {
  return (ATTACK_CARD_IDS as readonly string[]).includes(cardId);
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

      return true;
    })
    .sort((left, right) => left.queuedAt - right.queuedAt);
}

export function redirectPendingAttack(
  state: GameState,
  owner: Player,
  effectId: string,
  newTargetPlayerId: string,
  doubleDamage: boolean,
): { ok: true } | { ok: false; message: string } {
  if (newTargetPlayerId === owner.id) {
    return { ok: false, message: 'Invalid Mirror target.' };
  }

  const newTarget = findPlayer(state, newTargetPlayerId);

  if (newTarget === undefined || newTarget.isEliminated) {
    return { ok: false, message: 'Invalid Mirror target.' };
  }

  const index = owner.pendingEffects.findIndex((effect) => effect.id === effectId);

  if (index < 0) {
    return { ok: false, message: 'That pending attack is not available.' };
  }

  const [effect] = owner.pendingEffects.splice(index, 1);

  if (effect === undefined || !isAttackCardId(effect.cardId)) {
    return { ok: false, message: 'That pending attack is not available.' };
  }

  effect.targetPlayerId = newTargetPlayerId;

  if (doubleDamage) {
    effect.damageMultiplier *= 2;
  }

  newTarget.pendingEffects.push(effect);
  return { ok: true };
}

export function applyDefaultMirrorRedirect(state: GameState, rng: Rng): { ok: true } | { ok: false; message: string } {
  const choice = state.mirrorChoice;

  if (choice === null) {
    return { ok: false, message: 'No Mirror choice pending.' };
  }

  const owner = findPlayer(state, choice.playerId);

  if (owner === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  const eligible = listEligibleMirrorTargets(owner, choice.isUpgraded).filter((effect) =>
    choice.eligibleEffectIds.includes(effect.id),
  );
  const first = eligible[0];

  if (first === undefined) {
    return { ok: false, message: 'Nothing left to redirect.' };
  }

  const opponents = state.players.filter(
    (player) => player.id !== owner.id && !player.isEliminated,
  );

  if (opponents.length === 0) {
    return { ok: false, message: 'No opponent to redirect to.' };
  }

  const newTarget = rng.pick(opponents);
  return redirectPendingAttack(state, owner, first.id, newTarget.id, choice.isUpgraded);
}
