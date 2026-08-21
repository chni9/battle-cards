/**
 * Spoken / signed costs — L32-04 / designer 2026-08-21 follow-up.
 */

import { describe, expect, it } from 'vitest';

import {
  costAriaLabel,
  costSignGlyph,
  spokenCost,
} from './structured-cost';

describe('spokenCost signs (designer 2026-08-21)', () => {
  it('prefixes pay as minus and receive as plus', () => {
    expect(spokenCost({ kind: 'points', amount: 10 }, undefined, 'cost')).toBe(
      'minus 10 pts',
    );
    expect(spokenCost({ kind: 'points', amount: 7 }, undefined, 'gain')).toBe('plus 7 pts');
    expect(spokenCost({ kind: 'lives', amount: 1 }, undefined, 'gain')).toBe('plus 1 life');
    expect(spokenCost({ kind: 'upgradePoint', amount: 1 }, undefined, 'cost')).toBe(
      'minus 1 upgrade point',
    );
  });

  it('keeps unsigned costs for non-button chrome', () => {
    expect(spokenCost({ kind: 'points', amount: 1 }, undefined)).toBe('1 pt');
    expect(costAriaLabel({ kind: 'points', amount: 20 }, 'cost')).toBe('minus 20 pts');
    expect(costSignGlyph('cost')).toBe('−');
    expect(costSignGlyph('gain')).toBe('+');
    expect(costSignGlyph(undefined)).toBe('');
  });
});
