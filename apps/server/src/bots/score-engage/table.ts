/**
 * View-only engage table — backlog L40-02 / decisions.md 2026-08-18.
 *
 * Finishable / agro reads use this seat’s public fields, Spy slice, and public
 * pending queue. No `GameState`. No magic life number: weaker is relative to
 * `view.self.lives`.
 */

import {
  attackDamageFor,
  isAttackCardId,
  type PlayingStateView,
} from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import {
  bestAffordableStrikeDamage,
  effectDamage,
  findOwnCard,
  knownOpponentLives,
  ownCards,
} from '../policy-internals';

const ANSWER_CARD_IDS = new Set([
  'mirror',
  'shield',
  'absorber',
  'super-mirror',
  'super-absorber',
]);

export interface EngageTable {
  readonly finishableIds: ReadonlySet<string>;
  readonly attackerIds: ReadonlySet<string>;
  readonly incomingAttackDamage: number;
  readonly unusedUpgradePoints: number;
  readonly attackInstanceIds: readonly string[];
}

export function isAnswerCardId(cardId: string): boolean {
  return ANSWER_CARD_IDS.has(cardId);
}

export function pendingAttackDamageOn(
  view: PlayingStateView,
  targetPlayerId: string,
): number {
  let sum = 0;

  for (const effect of view.pendingEffects) {
    if (effect.targetPlayerId !== targetPlayerId || !isAttackCardId(effect.cardId)) {
      continue;
    }

    sum += effectDamage(effect.cardId, effect.isUpgraded, effect.damageMultiplier);
  }

  return sum;
}

function spiedCannotRetaliate(view: PlayingStateView, opponentId: string): boolean {
  const spied = view.players.find((player) => player.id === opponentId)?.spied;

  if (spied === undefined) {
    return false;
  }

  const cards = [...spied.hand, ...spied.specialCards];
  return !cards.some((card) => isAttackCardId(card.cardId));
}

function isFinishableSeat(view: PlayingStateView, opponentId: string): boolean {
  const knownLives = knownOpponentLives(view, opponentId);

  if (knownLives === null || knownLives <= 0) {
    return false;
  }

  const pending = pendingAttackDamageOn(view, opponentId);
  const ourHit = bestAffordableStrikeDamage(view);
  const remaining = knownLives - pending;
  const weaker = knownLives < view.self.lives;
  const underFire = pending > 0;
  const cannotRetaliate = spiedCannotRetaliate(view, opponentId);
  const canFinishThisCycle = ourHit > 0 && remaining <= ourHit;

  if (!canFinishThisCycle && !(underFire && weaker)) {
    return false;
  }

  return weaker || underFire || cannotRetaliate;
}

export function readEngageTable(view: PlayingStateView): EngageTable {
  const finishableIds = new Set<string>();
  const attackerIds = new Set<string>();
  let incomingAttackDamage = 0;

  for (const effect of view.pendingEffects) {
    if (effect.targetPlayerId !== view.you || !isAttackCardId(effect.cardId)) {
      continue;
    }

    attackerIds.add(effect.sourcePlayerId);
    incomingAttackDamage += effectDamage(
      effect.cardId,
      effect.isUpgraded,
      effect.damageMultiplier,
    );
  }

  for (const player of view.players) {
    if (player.id === view.you || player.isEliminated) {
      continue;
    }

    if (isFinishableSeat(view, player.id)) {
      finishableIds.add(player.id);
    }
  }

  const attackInstanceIds = ownCards(view)
    .filter((card) => isAttackCardId(card.cardId))
    .map((card) => card.instanceId);

  return {
    finishableIds,
    attackerIds,
    incomingAttackDamage,
    unusedUpgradePoints: view.self.upgradePoints,
    attackInstanceIds,
  };
}

export function attackTargetIds(
  view: PlayingStateView,
  action: TurnAction,
): readonly string[] {
  if (action.type === 'playCard') {
    const instance = findOwnCard(view, action.instanceId);

    if (
      instance === undefined ||
      !isAttackCardId(instance.cardId) ||
      action.targetPlayerId === undefined
    ) {
      return [];
    }

    return [action.targetPlayerId];
  }

  if (action.type === 'playMultipleAttacks') {
    return action.attacks.map((part) => part.targetPlayerId);
  }

  return [];
}

export function attackDamageOfAction(
  view: PlayingStateView,
  action: TurnAction,
): number {
  if (action.type === 'playCard') {
    const instance = findOwnCard(view, action.instanceId);

    if (instance === undefined || !isAttackCardId(instance.cardId)) {
      return 0;
    }

    return attackDamageFor(instance.cardId, instance.isUpgraded);
  }

  if (action.type === 'playMultipleAttacks') {
    let sum = 0;

    for (const part of action.attacks) {
      const instance = findOwnCard(view, part.instanceId);

      if (instance === undefined || !isAttackCardId(instance.cardId)) {
        continue;
      }

      sum += attackDamageFor(instance.cardId, instance.isUpgraded);
    }

    return sum;
  }

  return 0;
}
