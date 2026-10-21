/** The client default environment stays node (technical spec v7 §4.5; L72-06). */
import { describe, expect, it } from 'vitest';

describe('client default test environment (technical spec v7 §4.5)', () => {
  it('runs a .test.ts file in node, with no DOM globals', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });
});
