import { describe, expect, it } from 'vitest';
import { EXCLUDED_LABEL } from './ui-copy';

describe('ui copy (technical spec v7 §10.6)', () => {
  it('labels an excluded kit with a word, never with color alone (Q15)', () => {
    expect(EXCLUDED_LABEL).toBe('Excluded');
  });
});
