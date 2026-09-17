import { describe, expect, it } from 'vitest';

import { formatMinutesFromMs, kitDisplayName } from './admin-present';

describe('admin-present', () => {
  it('formats duration in minutes', () => {
    expect(formatMinutesFromMs(90_000)).toBe('1.5 min');
    expect(formatMinutesFromMs(null)).toBe('—');
  });

  it('uses catalog kit names', () => {
    expect(kitDisplayName('kamikaze')).toBe('Kamikaze');
  });
});
