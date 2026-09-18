import { describe, expect, it } from 'vitest';

import {
  formatMinutesFromMs,
  formatNullablePercent,
  formatThinkMs,
  kitDisplayName,
} from './admin-present';
import { DEFAULT_ADMIN_FILTERS, filtersToQuery, overviewQuery } from './filter-query';

describe('admin-present', () => {
  it('formats duration in minutes', () => {
    expect(formatMinutesFromMs(90_000)).toBe('1.5 min');
    expect(formatMinutesFromMs(null)).toBe('—');
  });

  it('formats think time in seconds', () => {
    expect(formatThinkMs(1500)).toBe('1.5 s');
    expect(formatThinkMs(null)).toBe('—');
    expect(formatNullablePercent(0.5)).toBe('50.0%');
    expect(formatNullablePercent(null)).toBe('—');
  });

  it('uses catalog kit names', () => {
    expect(kitDisplayName('kamikaze')).toBe('Kamikaze');
  });
});

describe('overviewQuery (L62-06)', () => {
  it('omits actors=both and sends humans', () => {
    expect(filtersToQuery(DEFAULT_ADMIN_FILTERS)['actors']).toBeUndefined();
    expect(overviewQuery(DEFAULT_ADMIN_FILTERS, 'both')['actors']).toBeUndefined();
    expect(overviewQuery(DEFAULT_ADMIN_FILTERS, 'humans')['actors']).toBe('humans');
  });
});
