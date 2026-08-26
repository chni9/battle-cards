/**
 * First-real-game hint ids — technical spec v6 §5.2 / L46-01.
 */

import { describe, expect, it } from 'vitest';

import { HINT_IDS, isHintId } from './hint-ids';

describe('hint ids (technical spec v6 §5.2 / L46-01)', () => {
  it('omits leave — forfeit is not a first-game hint', () => {
    expect(HINT_IDS).toEqual([
      'your-turn',
      'draw',
      'resources',
      'incoming',
      'hidden-kit',
      'shop',
    ]);
    expect(isHintId('leave')).toBe(false);
    expect(isHintId('your-turn')).toBe(true);
  });
});
