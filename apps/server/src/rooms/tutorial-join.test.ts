import { describe, expect, it } from 'vitest';

import { readTutorialCreateOption, shouldRejectTutorialJoin, shouldRejectTutorialAddBot } from './tutorial-join';

describe('readTutorialCreateOption (L41-05 / technical spec v6 §5.3)', () => {
  it('is true only when tutorial is the boolean true', () => {
    expect(readTutorialCreateOption({ tutorial: true })).toBe(true);
  });

  it('is false when tutorial is omitted, false, string, or 1', () => {
    expect(readTutorialCreateOption(undefined)).toBe(false);
    expect(readTutorialCreateOption({})).toBe(false);
    expect(readTutorialCreateOption({ tutorial: false })).toBe(false);
    expect(readTutorialCreateOption({ tutorial: 'true' })).toBe(false);
    expect(readTutorialCreateOption({ tutorial: 1 })).toBe(false);
  });
});

describe('shouldRejectTutorialJoin (L41-05 / technical spec v6 §5.3)', () => {
  it('rejects a second human on a tutorial room', () => {
    expect(shouldRejectTutorialJoin('tutorial', 1)).toBe(true);
    expect(shouldRejectTutorialJoin('tutorial', 2)).toBe(true);
  });

  it('allows the first human on a tutorial room', () => {
    expect(shouldRejectTutorialJoin('tutorial', 0)).toBe(false);
  });

  it('never rejects via this helper on a classic room', () => {
    expect(shouldRejectTutorialJoin('classic', 0)).toBe(false);
    expect(shouldRejectTutorialJoin('classic', 1)).toBe(false);
    expect(shouldRejectTutorialJoin('classic', 3)).toBe(false);
  });
});

describe('shouldRejectTutorialAddBot (L45-04)', () => {
  it('rejects ADD_BOT on tutorial rooms only', () => {
    expect(shouldRejectTutorialAddBot('tutorial')).toBe(true);
    expect(shouldRejectTutorialAddBot('classic')).toBe(false);
  });
});
