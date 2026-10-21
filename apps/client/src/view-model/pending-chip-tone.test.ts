/**
 * Pending chip callout tone — L51-07. Moved beside its module from
 * screens/table/pending-queue.test.ts (L72-04, technical spec v7 §12.2).
 */

import { describe, expect, it } from 'vitest';

import { pendingChipCalloutTone } from './pending-chip-tone';

describe('pending queue callouts (L51-07)', () => {
  it('uses red for attack-tone chips and orange for other real pending', () => {
    expect(pendingChipCalloutTone('basic-attack')).toBe('threat');
    expect(pendingChipCalloutTone('sentence')).toBe('threat');
    expect(pendingChipCalloutTone('spy')).toBe('guide');
    expect(pendingChipCalloutTone('thief')).toBe('guide');
  });
});
