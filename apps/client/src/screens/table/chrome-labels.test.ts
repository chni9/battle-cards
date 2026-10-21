/**
 * Economy / shop chrome labels — L43-02 / technical spec v6 §6.1.
 */

import { describe, expect, it } from 'vitest';

import { CHROME_COST_LABELS } from './chrome-labels';

describe('economy chrome labels (L43-02)', () => {
  it('does not use the UP token on chrome labels', () => {
    for (const label of CHROME_COST_LABELS) {
      expect(label).not.toMatch(/\bUP\b/);
    }
  });
});
