/**
 * Tutorial legal-action filter — technical spec v6 §5.4 / L45-03.
 * Intersects `listLegalActions` with the scripted kind. Does not fork handlers.
 */

import {
  actionReject,
  tutorialStepAt,
  type ActionReject,
  type CardId,
  type CardInstance,
  type GameState,
  type TutorialLegalKind,
} from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';
import { listLegalActions } from '../turn/list-legal-actions';
import type { TurnAction } from '../turn/perform-action';

export function intersectTutorialLegalActions(
  state: GameState,
  playerId: string,
  tutorialIndex: number,
): readonly TurnAction[] {
  const step = tutorialStepAt(tutorialIndex);

  if (step === undefined) {
    return [];
  }

  return listLegalActions(state, playerId).filter((action) =>
    actionMatchesTutorialKind(state, playerId, action, step.legalKind),
  );
}

export function isTutorialActionAllowed(
  state: GameState,
  playerId: string,
  tutorialIndex: number,
  action: TurnAction,
): boolean {
  return intersectTutorialLegalActions(state, playerId, tutorialIndex).some((legal) =>
    sameTurnAction(legal, action),
  );
}

export function tutorialFollowCoachReject(): ActionReject {
  return actionReject('tutorial-follow-coach');
}

export function sameTurnAction(left: TurnAction, right: TurnAction): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function actionMatchesTutorialKind(
  state: GameState,
  playerId: string,
  action: TurnAction,
  kind: TutorialLegalKind,
): boolean {
  const opponentId = opponentOf(state, playerId);

  switch (kind) {
    case 'draw':
    case 'bot-draw':
      return action.type === 'draw';
    case 'play-tax':
      return isPlay(state, playerId, action, 'tax', undefined, false);
    case 'play-basic':
      return isPlay(state, playerId, action, 'basic-attack', opponentId, false);
    case 'play-basic-upgraded':
      return isPlay(state, playerId, action, 'basic-attack', opponentId, true);
    case 'upgrade-spy':
      return isUpgrade(state, playerId, action, 'spy');
    case 'play-spy':
    case 'bot-play-spy':
      return isPlay(state, playerId, action, 'spy', opponentId);
    case 'sell-shield':
      return isSell(state, playerId, action, 'shield');
    case 'buy-upgrade-point':
      return action.type === 'buyUpgradePoint';
    case 'buy-absorber':
      return action.type === 'buyCard' && action.cardId === 'absorber';
    case 'play-super-regeneration':
      return isPlay(state, playerId, action, 'super-regeneration', undefined);
    case 'upgrade-basic':
      return isUpgrade(state, playerId, action, 'basic-attack');
    case 'play-absorber':
      return isPlay(state, playerId, action, 'absorber', opponentId);
    case 'bot-play-basic':
      return isPlay(state, playerId, action, 'basic-attack', opponentId, false);
    case 'bot-play-strong':
      return isPlay(state, playerId, action, 'strong-attack', opponentId);
    case 'bot-play-thief':
      return isPlay(state, playerId, action, 'thief', opponentId);
  }
}

function isPlay(
  state: GameState,
  playerId: string,
  action: TurnAction,
  cardId: CardId,
  targetPlayerId: string | undefined,
  isUpgraded?: boolean,
): boolean {
  if (action.type !== 'playCard') {
    return false;
  }

  if (targetPlayerId === undefined) {
    if (action.targetPlayerId !== undefined) {
      return false;
    }
  } else if (action.targetPlayerId !== targetPlayerId) {
    return false;
  }

  const card = heldCard(state, playerId, action.instanceId);

  if (card?.cardId !== cardId) {
    return false;
  }

  if (isUpgraded !== undefined && card.isUpgraded !== isUpgraded) {
    return false;
  }

  return true;
}

function isUpgrade(
  state: GameState,
  playerId: string,
  action: TurnAction,
  cardId: CardId,
): boolean {
  if (action.type !== 'upgradeCard') {
    return false;
  }

  return heldCard(state, playerId, action.instanceId)?.cardId === cardId;
}

function isSell(
  state: GameState,
  playerId: string,
  action: TurnAction,
  cardId: CardId,
): boolean {
  if (action.type !== 'sellCard') {
    return false;
  }

  return heldCard(state, playerId, action.instanceId)?.cardId === cardId;
}

function heldCard(
  state: GameState,
  playerId: string,
  instanceId: string,
): CardInstance | undefined {
  const player = findPlayer(state, playerId);

  if (player === undefined) {
    return undefined;
  }

  return [...player.hand, ...player.specialCards].find((card) => card.instanceId === instanceId);
}

function opponentOf(state: GameState, playerId: string): string | undefined {
  return state.players.find((player) => player.id !== playerId && !player.isEliminated)?.id;
}
