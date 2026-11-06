/**
 * The tutorial gate's legal-kind mapping — technical spec v7 §6.12, §6.6.4; Lot 75 plan Appendix A.8.5
 * (L75-05; controller ruling R8, open-question ruling 8, K5).
 *
 * Every `ArenaIntent` kind maps to the V2 `TutorialSendIntent` that `tutorialSendAllowed` reads. A card
 * is read from the POV's hand, then the specials; a card the POV does not hold (an in-play target, a
 * stale id) maps to `other`, which no human step allows. Unspy, pool buys, Deactivate and Activate
 * duplication map to `other` too, so the client vetoes them as the server rejects them
 * (`game-room.ts` `rejectTutorialIllegalAction`, `tutorial-follow-coach`). `resolveSubChoice` has a
 * case only for the exhaustive switch: `tutorial.allows` never consults it (K5).
 */

import type { CardInstance, PlayingStateView } from '@card-battle/shared';

import type { TutorialSendIntent } from '../../view-model/tutorial-coach-copy';
import type { ArenaIntent } from './arena-commit';

const OTHER: TutorialSendIntent = { kind: 'other' };

/** The POV's held card with that instance id: the hand first, then the specials. */
function held(view: PlayingStateView, instanceId: string): CardInstance | undefined {
  return (
    view.self.hand.find((card) => card.instanceId === instanceId) ??
    view.self.specialCards.find((card) => card.instanceId === instanceId)
  );
}

/** Every ArenaIntent → the V2 TutorialSendIntent; a held card is looked up in view.self.hand, then view.self.specialCards. */
export function tutorialIntentOf(intent: ArenaIntent, view: PlayingStateView): TutorialSendIntent {
  switch (intent.kind) {
    case 'playCard': {
      const card = held(view, intent.payload.instanceId);
      return card === undefined ? OTHER : { kind: 'playCard', cardId: card.cardId, isUpgraded: card.isUpgraded };
    }
    case 'sellCard': {
      const card = held(view, intent.payload.instanceId);
      return card === undefined ? OTHER : { kind: 'sellCard', cardId: card.cardId };
    }
    case 'upgradeCard': {
      const card = held(view, intent.payload.instanceId);
      return card === undefined ? OTHER : { kind: 'upgradeCard', cardId: card.cardId };
    }
    case 'playMultipleAttacks':
      return { kind: 'playMultipleAttacks' };
    case 'deactivatePersistent':
      return OTHER;
    case 'clearSpy':
      return OTHER;
    case 'drawCard':
      return { kind: 'draw' };
    case 'activateDuplication':
      return OTHER;
    case 'buyCard':
      return { kind: 'buyCard', cardId: intent.payload.cardId };
    case 'buyUpgradePoint':
      return { kind: 'buyUpgradePoint' };
    case 'sellUpgradePoint':
      return { kind: 'sellUpgradePoint' };
    case 'buySpecialCard':
      return { kind: 'buySpecialCard' };
    case 'buyPoolCard':
      return OTHER;
    case 'resolveSubChoice':
      return OTHER;
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
}
