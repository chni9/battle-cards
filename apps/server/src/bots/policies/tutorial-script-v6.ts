/**
 * Scripted tutorial bot — technical spec v6 §5.4 / designer 2026-08-25 (L45-02).
 * View-only (v3 decision 2). Never reads GameState.
 */

import {
  tutorialStepAt,
  type CardInstance,
  type KitId,
  type PlayingStateView,
  type TutorialLegalKind,
} from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import type { BotPolicy, PolicyDecideContext } from '../policy-types';
import { randomLegalPolicy } from './random-legal';

export const TUTORIAL_SCRIPT_V6_POLICY_ID = 'tutorial-script-v6';

const DRAW: TurnAction = { type: 'draw' };

export const tutorialScriptV6Policy: BotPolicy = {
  id: TUTORIAL_SCRIPT_V6_POLICY_ID,
  weightsHash: 'tutorial-script-v6:v0',
  decide(view, actions, rng, ctx: PolicyDecideContext) {
    void rng;
    void ctx;

    const picked = pickTutorialScriptAction(view, actions);
    return { action: picked ?? DRAW, reason: { code: 'policy-fallback' } };
  },
  pickMirrorRedirect: (view, rng, eligibleEffectIds) =>
    randomLegalPolicy.pickMirrorRedirect(view, rng, eligibleEffectIds),
  pickEliminationRewards: (view, availableCards, lifeLimit, rng) =>
    randomLegalPolicy.pickEliminationRewards(view, availableCards, lifeLimit, rng),
  pickStealInstanceId: (view, eligibleInstanceIds, rng) =>
    randomLegalPolicy.pickStealInstanceId(view, eligibleInstanceIds, rng),
  pickPoolInstanceIds: (poolCards, eligibleIds, maxCount, rng) =>
    randomLegalPolicy.pickPoolInstanceIds(poolCards, eligibleIds, maxCount, rng),
  pickSpecialCardId: (eligibleCardIds, rng) =>
    randomLegalPolicy.pickSpecialCardId(eligibleCardIds, rng),
  pickReanimationKitId: (eligibleKitIds: readonly KitId[], rng) =>
    randomLegalPolicy.pickReanimationKitId(eligibleKitIds, rng),
};

export function pickTutorialScriptAction(
  view: PlayingStateView,
  actions: readonly TurnAction[],
): TurnAction | undefined {
  if (view.playKind !== 'tutorial' || view.tutorialIndex === null) {
    return actions.find((action) => action.type === 'draw') ?? actions[0];
  }

  const step = tutorialStepAt(view.tutorialIndex);

  if (step?.actor !== 'bot') {
    return actions.find((action) => action.type === 'draw') ?? actions[0];
  }

  return actions.find((action) => actionMatchesKind(action, step.legalKind, view));
}

function actionMatchesKind(
  action: TurnAction,
  kind: TutorialLegalKind,
  view: PlayingStateView,
): boolean {
  const opponentId = view.players.find(
    (player) => player.id !== view.you && !player.isEliminated,
  )?.id;

  switch (kind) {
    case 'bot-draw':
      return action.type === 'draw';
    case 'bot-play-basic':
      return isPlay(action, view, 'basic-attack', opponentId);
    case 'bot-play-strong':
      return isPlay(action, view, 'strong-attack', opponentId);
    case 'bot-play-spy':
      return isPlay(action, view, 'spy', opponentId);
    case 'bot-play-thief':
      return isPlay(action, view, 'thief', opponentId);
    default:
      return false;
  }
}

function isPlay(
  action: TurnAction,
  view: PlayingStateView,
  cardId: CardInstance['cardId'],
  targetPlayerId: string | undefined,
): boolean {
  if (action.type !== 'playCard' || action.targetPlayerId !== targetPlayerId) {
    return false;
  }

  return heldCards(view).some(
    (card) => card.instanceId === action.instanceId && card.cardId === cardId,
  );
}

function heldCards(view: PlayingStateView): readonly CardInstance[] {
  return [...view.self.hand, ...view.self.specialCards];
}
