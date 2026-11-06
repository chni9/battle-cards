/** The hand's scroll-edge cue: technical spec v7 §6.1 item 4; Q87-4 (L75-13). */
import { describe, expect, it } from 'vitest';

import { hiddenEdges } from './hand-scroll-cue';

const region = (scrollWidth: number, clientWidth: number, scrollLeft: number) => ({ scrollWidth, clientWidth, scrollLeft });

describe('hiddenEdges (1 px slack)', () => {
  it.each([
    { label: 'no overflow', box: region(360, 360, 0), expected: 'none' },
    { label: 'at the start', box: region(900, 360, 0), expected: 'right' },
    { label: 'exactly 1 px from the start is still the start', box: region(900, 360, 1), expected: 'right' },
    { label: '2 px from the start hides the left', box: region(900, 360, 2), expected: 'both' },
    { label: 'mid-way', box: region(900, 360, 200), expected: 'both' },
    { label: '1 px short of the end is the end', box: region(900, 360, 539), expected: 'left' },
    { label: '2 px short of the end still hides the right', box: region(900, 360, 538), expected: 'both' },
    { label: 'at the end', box: region(900, 360, 540), expected: 'left' },
    { label: 'one pixel of overflow is not an overflow', box: region(361, 360, 0), expected: 'none' },
    { label: 'two pixels of overflow are', box: region(362, 360, 0), expected: 'right' },
  ])('$label', ({ box, expected }) => {
    expect(hiddenEdges(box)).toBe(expected);
  });
});
