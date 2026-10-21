/** Roving-focus keyboard model for Tabs and Segmented (WAI-ARIA APG tabs and radio group). */
import { describe, expect, it } from 'vitest';
import { edgeEnabledIndex, nextEnabledIndex, rovingKeyFor } from './roving-focus';

describe('nextEnabledIndex', () => {
  it('steps forward and back with wrap-around', () => {
    const all = [false, false, false];
    expect(nextEnabledIndex(all, 0, 1)).toBe(1);
    expect(nextEnabledIndex(all, 2, 1)).toBe(0);
    expect(nextEnabledIndex(all, 0, -1)).toBe(2);
  });

  it('skips disabled items', () => {
    expect(nextEnabledIndex([false, true, false], 0, 1)).toBe(2);
    expect(nextEnabledIndex([false, false, true], 1, 1)).toBe(0);
  });

  it('stays put when no other item is enabled', () => {
    expect(nextEnabledIndex([false, true, true], 0, 1)).toBe(0);
  });
});

describe('edgeEnabledIndex', () => {
  it('finds the first and last enabled items', () => {
    expect(edgeEnabledIndex([true, false, false], 'first')).toBe(1);
    expect(edgeEnabledIndex([false, false, true], 'last')).toBe(1);
  });

  it('returns -1 when every item is disabled', () => {
    expect(edgeEnabledIndex([true, true], 'first')).toBe(-1);
  });
});

describe('rovingKeyFor', () => {
  it('maps the horizontal tablist keys', () => {
    expect(['ArrowRight', 'ArrowLeft', 'Home', 'End', 'ArrowDown'].map((key) => rovingKeyFor(key, 'tabs'))).toEqual([
      'next',
      'previous',
      'first',
      'last',
      null,
    ]);
  });

  it('maps radio keys on both axes', () => {
    expect(
      ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'Enter'].map((key) => rovingKeyFor(key, 'radios')),
    ).toEqual(['next', 'next', 'previous', 'previous', null, null]);
  });
});
