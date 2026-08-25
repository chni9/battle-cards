/**
 * After a successful tutorial action, bump the cursor and snap the seat to the
 * next scripted actor when Classic `advanceTurn` would disagree (indices 0→1).
 * Technical spec v6 §5.4 / decisions.md 2026-08-25 / L45-03.
 */

import { tutorialStepAt, type GameState } from '@card-battle/shared';

import { beginTurnFor, findPlayer } from '../turn/advance-turn';
import { findSoleSurvivorId } from '../turn/elimination-rewards';
import type { TutorialSeatIds } from './apply-tutorial-setup';

export function advanceTutorialCursor(
  state: GameState,
  tutorialIndex: number,
  seats: TutorialSeatIds,
): number {
  const nextIndex = tutorialIndex + 1;

  if (findSoleSurvivorId(state) !== null) {
    return nextIndex;
  }

  const step = tutorialStepAt(nextIndex);

  if (step === undefined) {
    return nextIndex;
  }

  const actorId = step.actor === 'human' ? seats.humanId : seats.botId;

  if (state.currentTurnPlayerId === actorId) {
    return nextIndex;
  }

  const actor = findPlayer(state, actorId);

  if (actor === undefined || actor.isEliminated) {
    return nextIndex;
  }

  state.currentTurnPlayerId = actorId;
  beginTurnFor(state, actor);
  return nextIndex;
}
