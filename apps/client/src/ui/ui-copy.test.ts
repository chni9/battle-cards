import { describe, expect, it } from 'vitest';
import { EXCLUDED_LABEL, MINIMIZE_LABEL, carouselPositionLabel } from './ui-copy';

describe('ui copy (technical spec v7 §10.6)', () => {
  it('labels an excluded kit with a word, never with color alone (Q15)', () => {
    expect(EXCLUDED_LABEL).toBe('Excluded');
  });

  it('names the blocking-sheet collapse control "Minimize" (Q59)', () => {
    expect(MINIMIZE_LABEL).toBe('Minimize');
  });

  it('announces a carousel position as "{label}, {n} of {m}"', () => {
    expect(carouselPositionLabel('How to play', 2, 3)).toBe('How to play, 2 of 3');
  });
});
