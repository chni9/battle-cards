/**
 * Enumerate legal search decisions — technical spec v5 §6 / L35-02.
 * While a sub-choice is active, listLegalActions is empty; decisions live here.
 */

import {
  KIT_IDS,
  SPECIAL_CARD_IDS,
  type GameState,
  type RewardChoice,
} from '@card-battle/shared';

import { listAvailableRewardCards } from '../../engine/turn/elimination-rewards';
import { listLegalActions } from '../../engine/turn/list-legal-actions';
import { activeSubChoiceKind } from '../../engine/turn/sub-choice';
import type { SearchDecision } from './search-types';

/** Soft cap for combinatorial sub-choice sets (pool pairs / reward pairs). */
const COMBINATORIAL_CAP = 32;

export function searchDecisionOwner(state: GameState): string | null {
  const kind = activeSubChoiceKind(state);

  if (kind === 'mirror') {
    return state.mirrorChoice?.playerId ?? null;
  }

  if (kind === 'steal-pick') {
    return state.stealChoice?.playerId ?? null;
  }

  if (kind === 'pool-pick' || kind === 'special-pick' || kind === 'reanimation-kit') {
    return state.subChoice?.playerId ?? null;
  }

  if (kind === 'elimination-reward') {
    return state.rewardChoice?.eliminatorPlayerId ?? null;
  }

  return state.currentTurnPlayerId;
}

export function listSearchDecisions(state: GameState): readonly SearchDecision[] {
  const kind = activeSubChoiceKind(state);

  if (kind === null) {
    const owner = state.currentTurnPlayerId;

    if (owner === null) {
      return [];
    }

    return listLegalActions(state, owner).map((action) => ({
      kind: 'action' as const,
      action,
    }));
  }

  switch (kind) {
    case 'mirror':
      return listMirrorDecisions(state);
    case 'steal-pick':
      return listStealDecisions(state);
    case 'pool-pick':
      return listPoolDecisions(state);
    case 'special-pick':
      return listSpecialDecisions(state);
    case 'reanimation-kit':
      return listReanimationDecisions(state);
    case 'elimination-reward':
      return listRewardDecisions(state);
  }
}

function listMirrorDecisions(state: GameState): readonly SearchDecision[] {
  const choice = state.mirrorChoice;

  if (choice === null) {
    return [];
  }

  const targets = state.players
    .filter((player) => !player.isEliminated && player.id !== choice.playerId)
    .map((player) => player.id)
    .sort((left, right) => left.localeCompare(right));

  const decisions: SearchDecision[] = [];

  for (const pendingEffectId of choice.eligibleEffectIds) {
    for (const newTargetPlayerId of targets) {
      decisions.push({
        kind: 'mirror',
        pendingEffectId,
        newTargetPlayerId,
      });
    }
  }

  return decisions;
}

function listStealDecisions(state: GameState): readonly SearchDecision[] {
  const choice = state.stealChoice;

  if (choice === null) {
    return [];
  }

  return [...choice.eligibleInstanceIds]
    .sort((left, right) => left.localeCompare(right))
    .map((instanceId) => ({ kind: 'steal-pick' as const, instanceId }));
}

function listPoolDecisions(state: GameState): readonly SearchDecision[] {
  const choice = state.subChoice;

  if (choice?.kind !== 'pool-pick') {
    return [];
  }

  const eligible = [...choice.eligibleInstanceIds].sort((left, right) =>
    left.localeCompare(right),
  );
  const combos = combinations(eligible, choice.maxCount).slice(0, COMBINATORIAL_CAP);

  return combos.map((instanceIds) => ({
    kind: 'pool-pick' as const,
    instanceIds,
  }));
}

function listSpecialDecisions(state: GameState): readonly SearchDecision[] {
  const choice = state.subChoice;

  if (choice?.kind !== 'special-pick') {
    return [];
  }

  const ids =
    choice.eligibleCardIds.length > 0 ? choice.eligibleCardIds : SPECIAL_CARD_IDS;

  return [...ids]
    .sort((left, right) => left.localeCompare(right))
    .map((cardId) => ({ kind: 'special-pick' as const, cardId }));
}

function listReanimationDecisions(state: GameState): readonly SearchDecision[] {
  const choice = state.subChoice;

  if (choice?.kind !== 'reanimation-kit') {
    return [];
  }

  const ids = choice.eligibleKitIds.length > 0 ? choice.eligibleKitIds : KIT_IDS;

  return [...ids]
    .sort((left, right) => left.localeCompare(right))
    .map((kitId) => ({ kind: 'reanimation-kit' as const, kitId }));
}

function listRewardDecisions(state: GameState): readonly SearchDecision[] {
  const choice = state.rewardChoice;

  if (choice === null) {
    return [];
  }

  const cards = listAvailableRewardCards(state, choice.eliminatedPlayerId);
  const atoms: RewardChoice[] = [
    { type: 'lives' },
    { type: 'points' },
    { type: 'upgradePoint' },
    ...cards
      .map((card) => card.instanceId)
      .sort((left, right) => left.localeCompare(right))
      .map((instanceId) => ({ type: 'card' as const, instanceId })),
  ];

  const decisions: SearchDecision[] = [];

  for (const first of atoms) {
    for (const second of atoms) {
      if (
        first.type === 'card' &&
        second.type === 'card' &&
        first.instanceId === second.instanceId
      ) {
        continue;
      }

      decisions.push({
        kind: 'elimination-reward',
        chooserPlayerId: choice.eliminatorPlayerId,
        eliminationId: choice.eliminationId,
        choices: [first, second],
      });

      if (decisions.length >= COMBINATORIAL_CAP) {
        return decisions;
      }
    }
  }

  return decisions;
}

function combinations(items: readonly string[], k: number): string[][] {
  if (k <= 0 || k > items.length) {
    return k === 0 ? [[]] : [];
  }

  const out: string[][] = [];

  const walk = (start: number, acc: string[]): void => {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }

    for (let index = start; index < items.length; index += 1) {
      const item = items[index];

      if (item === undefined) {
        continue;
      }

      acc.push(item);
      walk(index + 1, acc);
      acc.pop();
    }
  };

  walk(0, []);
  return out;
}
