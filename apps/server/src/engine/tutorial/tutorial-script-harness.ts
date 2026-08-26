/**
 * Seeded tutorial walk helper — L45-03 / L45-07. Tests only.
 */

import { tutorialStepAt, type GameState } from '@card-battle/shared';

import { createInitialState } from '../create-initial-state';
import {
  performTurnAction,
  type PerformActionResult,
  type TurnAction,
} from '../turn/perform-action';
import { advanceTutorialCursor } from './advance-tutorial-cursor';
import { applyTutorialSetup, type TutorialSeatIds } from './apply-tutorial-setup';
import { intersectTutorialLegalActions } from './intersect-tutorial-legal';

export const TUTORIAL_HARNESS_HUMAN_ID = 'a';
export const TUTORIAL_HARNESS_BOT_ID = 'b';

export interface TutorialHarness {
  state: GameState;
  seats: TutorialSeatIds;
  index: number;
}

export function bootTutorialHarness(seed = 'tutorial-script-v6'): TutorialHarness {
  const state = createInitialState({
    seats: [
      { id: TUTORIAL_HARNESS_HUMAN_ID, nickname: 'You' },
      { id: TUTORIAL_HARNESS_BOT_ID, nickname: 'Alpha' },
    ],
    seed,
  });
  const seats: TutorialSeatIds = {
    humanId: TUTORIAL_HARNESS_HUMAN_ID,
    botId: TUTORIAL_HARNESS_BOT_ID,
  };
  applyTutorialSetup(state, seats);
  return { state, seats, index: 0 };
}

export function tutorialActorId(harness: TutorialHarness, index = harness.index): string {
  const step = tutorialStepAt(index);

  if (step === undefined) {
    throw new RangeError(`no tutorial step ${String(index)}`);
  }

  return step.actor === 'human' ? harness.seats.humanId : harness.seats.botId;
}

export function tutorialLegalAt(
  harness: TutorialHarness,
  index = harness.index,
): readonly TurnAction[] {
  return intersectTutorialLegalActions(harness.state, tutorialActorId(harness, index), index);
}

export function playTutorialIndex(harness: TutorialHarness): PerformActionResult {
  const index = harness.index;
  const actorId = tutorialActorId(harness, index);
  const legal = tutorialLegalAt(harness, index);
  const action = legal[0];

  if (action === undefined) {
    throw new RangeError(`no legal tutorial action at index ${String(index)}`);
  }

  const result = performTurnAction(harness.state, actorId, action);

  if (!result.ok) {
    return result;
  }

  harness.index = advanceTutorialCursor(harness.state, index, harness.seats);
  return result;
}

export function playTutorialThrough(harness: TutorialHarness, lastInclusive: number): void {
  while (harness.index <= lastInclusive) {
    const result = playTutorialIndex(harness);

    if (!result.ok) {
      throw new Error(
        `tutorial step ${String(harness.index)} rejected: ${result.code}`,
      );
    }
  }
}
