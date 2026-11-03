/**
 * Pre-send choice model: technical spec v7 §6.6.2; Appendix A `regeneration-quantity-picker`,
 * `card-transformer-consume-picker` (L74-10).
 */
import { describe, expect, it } from 'vitest';

import { makeCard } from '../../view-model/test-fixtures';
import { regenerationTileLabel, resolveConsumeId } from './pre-send-model';

describe('pre-send model', () => {
  it('names a Regeneration tile with its spoken price', () => {
    expect(regenerationTileLabel({ quantity: 1, label: '1 life', totalCost: 3, enabled: true, reason: null })).toBe('1 life, minus 3 pts');
    expect(regenerationTileLabel({ quantity: 4, label: '4 lives', totalCost: 8, enabled: false, reason: 'not-enough-points' })).toBe('4 lives, minus 8 pts');
  });

  it('keeps the picked consume card while it is offered, else falls back to the first (V2)', () => {
    const attack = makeCard('basic-attack', { instanceId: 'atk-1' });
    const tax = makeCard('tax', { instanceId: 'tax-1' });
    expect(resolveConsumeId([attack, tax], null)).toBe('atk-1');
    expect(resolveConsumeId([attack, tax], 'tax-1')).toBe('tax-1');
    expect(resolveConsumeId([attack], 'tax-1')).toBe('atk-1');
    expect(resolveConsumeId([], 'tax-1')).toBeNull();
  });
});
