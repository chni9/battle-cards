import { describe, expect, it } from 'vitest';

import {
  isTutorialLookPending,
  isTutorialTourActive,
  TUTORIAL_LOOK_COACH,
  TUTORIAL_SPY_RESOLVE_INDEX,
  TUTORIAL_TOUR_STEPS,
  tutorialTourStepAt,
} from './tour';

describe('tutorial board tour (technical spec v6 §5.4)', () => {
  it('presents every listed board region once', () => {
    expect(TUTORIAL_TOUR_STEPS.map((step) => step.highlight)).toEqual([
      'your-zone',
      'hand',
      'specials',
      'resources',
      'incoming',
      'shop',
      'opponent',
      'action-log',
      'timer',
      'kit',
      'flag',
    ]);
  });

  it('runs only at index 0 until Got it finishes the table', () => {
    expect(isTutorialTourActive(0, 0)).toBe(true);
    expect(isTutorialTourActive(0, TUTORIAL_TOUR_STEPS.length - 1)).toBe(true);
    expect(isTutorialTourActive(0, TUTORIAL_TOUR_STEPS.length)).toBe(false);
    expect(isTutorialTourActive(1, 0)).toBe(false);
    expect(isTutorialTourActive(null, 0)).toBe(false);
  });

  it('first step copy names your zone', () => {
    expect(tutorialTourStepAt(0)?.coach.body).toMatch(/your zone/i);
  });
});

describe('tutorial Look gate (technical spec v6 §5.4)', () => {
  it('is required after Spy resolves at index 8', () => {
    expect(TUTORIAL_SPY_RESOLVE_INDEX).toBe(8);
    expect(isTutorialLookPending(8, false)).toBe(false);
    expect(isTutorialLookPending(9, false)).toBe(true);
    expect(isTutorialLookPending(9, true)).toBe(false);
    expect(isTutorialLookPending(11, false)).toBe(true);
  });

  it('tells the player they can click the opponent', () => {
    expect(TUTORIAL_LOOK_COACH.body).toMatch(/click/i);
    expect(TUTORIAL_LOOK_COACH.body).toMatch(/opponent/i);
  });
});
