import { describe, expect, it } from 'vitest';
import { hasMoreToTheRight } from './admin-scroll-cue';

describe('hasMoreToTheRight (technical spec v7 §7.8, L80-12)', () => {
  it.each([
    // [scrollWidth, clientWidth, scrollLeft, more]
    ['overflowing and at the start', 900, 300, 0, true],
    ['overflowing and part-way', 900, 300, 250, true],
    ['overflowing and at the end', 900, 300, 600, false],
    ['at the end by a fractional scroll position', 900, 300, 599.5, false],
    ['one pixel short of the end', 900, 300, 599, false],
    ['two pixels short of the end', 900, 300, 598, true],
    ['not overflowing', 300, 300, 0, false],
    ['the happy-dom zeros of an unmeasured region', 0, 0, 0, false],
  ] as const)('%s', (_name, scrollWidth, clientWidth, scrollLeft, expected) => {
    expect(hasMoreToTheRight({ scrollWidth, clientWidth, scrollLeft })).toBe(expected);
  });
});
