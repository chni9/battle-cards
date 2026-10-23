/**
 * First-real-game hint ids — technical spec v6 §5.2 / L46-01.
 */

import { describe, expect, it } from 'vitest';

import { HINT_IDS, hintAnchorId, hintPlacePrefer, isHintId } from './hint-ids';

describe('hint ids (technical spec v6 §5.2 / L46-01)', () => {
  it('omits leave — forfeit is not a first-game hint', () => {
    expect(HINT_IDS).toEqual([
      'your-turn',
      'draw',
      'hand',
      'specials',
      'resources',
      'incoming',
      'incoming-thief',
      'hidden-kit',
      'shop',
      'reward',
    ]);
    expect(isHintId('leave')).toBe(false);
    expect(isHintId('your-turn')).toBe(true);
    expect(isHintId('incoming-thief')).toBe(true);
    expect(isHintId('reward')).toBe(true);
  });

  it('maps incoming-thief onto the Incoming strip anchor', () => {
    expect(hintAnchorId('incoming-thief')).toBe('incoming');
    expect(hintAnchorId('incoming')).toBe('incoming');
    expect(hintAnchorId('hand')).toBe('hand');
    expect(hintAnchorId('reward')).toBe('reward');
  });

  it('places Hand and Specials beside the card cluster', () => {
    expect(hintPlacePrefer('hand')).toBe('beside');
    expect(hintPlacePrefer('specials')).toBe('beside');
    expect(hintPlacePrefer('draw')).toBe('below');
    expect(hintPlacePrefer('incoming')).toBe('below');
  });
});
