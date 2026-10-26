/** Banner items — L72-18 (technical spec v7 §6.12, §8.1; L51-06, L63-03, L67-01). */
import { describe, expect, it } from 'vitest';

import { contrastRatio, WCAG_AA_TEXT } from '../contrast';
import { V7_COLORS, V7_SEAT_COLORS } from '../palette';
import { bannerItemsForCues, bannerLiveMode } from './banner-items';

describe('banner items (L72-18)', () => {
  it('maps cues to keyed items with the locked copy, in order', () => {
    expect(bannerItemsForCues(['attacked', 'turn'], 5)).toEqual([
      { key: 'attacked:5', kind: 'attacked', text: 'You are being attacked' },
      { key: 'turn:6', kind: 'turn', text: 'Your turn' },
    ]);
    expect(bannerItemsForCues(['won'], 0)).toEqual([{ key: 'won:0', kind: 'won', text: 'You won!' }]);
    expect(bannerItemsForCues(['dead'], 2)).toEqual([{ key: 'dead:2', kind: 'dead', text: 'You are dead' }]);
    expect(bannerItemsForCues([], 9)).toEqual([]);
  });

  it('announces Sentence and wipe assertively and the four cues politely', () => {
    for (const kind of ['turn', 'attacked', 'dead', 'won'] as const) {
      expect(bannerLiveMode(kind)).toBe('polite');
    }
    expect(bannerLiveMode('sentence')).toBe('assertive');
    expect(bannerLiveMode('wipe')).toBe('assertive');
  });

  it('keeps the --text-on-cta label at AA on every banner fill', () => {
    for (const fill of [V7_COLORS.cta, V7_COLORS['threat-attack'], V7_COLORS.danger, ...V7_SEAT_COLORS]) {
      expect(contrastRatio(V7_COLORS['text-on-cta'], fill)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    }
  });
});
