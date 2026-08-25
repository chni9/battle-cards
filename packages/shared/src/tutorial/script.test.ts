import { describe, expect, it } from 'vitest';

import { TUTORIAL_LAST_INDEX, TUTORIAL_STEPS, tutorialStepAt } from './script';

describe('TUTORIAL_STEPS (technical spec v6 §5.4 / designer 2026-08-25)', () => {
  it('covers indices 0–30 exactly once in order', () => {
    expect(TUTORIAL_STEPS).toHaveLength(TUTORIAL_LAST_INDEX + 1);
    expect(TUTORIAL_STEPS.map((step) => step.index)).toEqual(
      Array.from({ length: TUTORIAL_LAST_INDEX + 1 }, (_, index) => index),
    );
  });

  it('starts with two human beats, then alternates', () => {
    expect(tutorialStepAt(0)?.actor).toBe('human');
    expect(tutorialStepAt(1)?.actor).toBe('human');
    for (let index = 1; index < TUTORIAL_STEPS.length; index += 1) {
      expect(TUTORIAL_STEPS[index]?.actor).toBe(index % 2 === 1 ? 'human' : 'bot');
    }
  });

  it('index 0 copy mentions Draw is points', () => {
    expect(tutorialStepAt(0)?.coach?.body).toMatch(/points/i);
    expect(tutorialStepAt(0)?.coach?.body).toMatch(/not a card/i);
  });

  it('index 3 copy mentions equal cancel', () => {
    expect(tutorialStepAt(3)?.coach?.body).toMatch(/[Ee]qual/);
    expect(tutorialStepAt(3)?.coach?.body).toMatch(/cancel/i);
  });

  it('index 1 and 21 Tax copy mention 4 points', () => {
    expect(tutorialStepAt(1)?.coach?.body).toMatch(/4 points/);
    expect(tutorialStepAt(21)?.coach?.body).toMatch(/4 points/);
  });

  it('index 17 plays Shield against incoming Strong', () => {
    expect(tutorialStepAt(17)?.legalKind).toBe('play-shield');
    expect(tutorialStepAt(17)?.highlight).toBe('shield');
    expect(tutorialStepAt(17)?.coach?.body).toMatch(/Shield/);
    expect(tutorialStepAt(17)?.coach?.body).toMatch(/Strong/);
  });

  it('index 19 coaches Thief and Super Regeneration', () => {
    expect(tutorialStepAt(19)?.legalKind).toBe('play-super-regeneration');
    expect(tutorialStepAt(19)?.coach?.title).toBe('Thief');
    expect(tutorialStepAt(19)?.coach?.body).toMatch(/Thief/);
    expect(tutorialStepAt(19)?.coach?.body).toMatch(/Super Regeneration/);
    expect(tutorialStepAt(19)?.coach?.body).toMatch(/points/);
  });
});
