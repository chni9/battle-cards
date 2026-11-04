import { describe, expect, it } from 'vitest';

import { TUTORIAL_LAST_INDEX } from './script';
import {
  isTutorialLookPending,
  isTutorialTourActive,
  TUTORIAL_LOOK_COACH,
  TUTORIAL_LOOK_INDEX,
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

  it('flag copy is skip tutorial, not a forfeit', () => {
    const flag = TUTORIAL_TOUR_STEPS.find((step) => step.highlight === 'flag');
    expect(flag?.coach.body).toMatch(/skip/i);
    expect(flag?.coach.body).toMatch(/not a forfeit/i);
  });

  it('the Opponent step: kit and cards need an upgraded Spy, a basic Spy shows only resources (§10.1, Lot 69)', () => {
    const body = TUTORIAL_TOUR_STEPS.find((step) => step.highlight === 'opponent')?.coach.body;
    expect(body).toContain('upgraded Spy');
    expect(body).toContain('A basic Spy shows only their resources.');
    expect(body).not.toContain('until Spy reveals them');
  });

  it('no tour or Look copy has a space before an exclamation mark (§10.2)', () => {
    for (const copy of [...TUTORIAL_TOUR_STEPS.map((step) => step.coach), TUTORIAL_LOOK_COACH]) {
      expect(copy.title).not.toContain(' !');
      expect(copy.body).not.toContain(' !');
    }
  });
});

describe('tutorial Look gate (technical spec v6 §5.4)', () => {
  it('is required only on the sell step after Spy resolves', () => {
    expect(TUTORIAL_SPY_RESOLVE_INDEX).toBe(8);
    expect(TUTORIAL_LOOK_INDEX).toBe(9);
    expect(isTutorialLookPending(8, false)).toBe(false);
    expect(isTutorialLookPending(9, false)).toBe(true);
    expect(isTutorialLookPending(9, true)).toBe(false);
    expect(isTutorialLookPending(11, false)).toBe(false);
    expect(isTutorialLookPending(TUTORIAL_LAST_INDEX, false)).toBe(false);
  });

  it('tells the player they can click the opponent', () => {
    expect(TUTORIAL_LOOK_COACH.body).toMatch(/click/i);
    expect(TUTORIAL_LOOK_COACH.body).toMatch(/opponent/i);
  });
});
