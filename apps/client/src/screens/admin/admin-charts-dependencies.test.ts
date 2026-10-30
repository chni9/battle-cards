import { describe, expect, it } from 'vitest';

import clientPackage from '../../../package.json';

const CHART_LIBRARY = /chart|recharts|victory|nivo|plotly|d3/i;

describe('admin charts dependencies (L80-04)', () => {
  it('the client depends on no chart library (L62-05, spec v7 §4.5)', () => {
    const declared = [
      ...Object.keys(clientPackage.dependencies),
      ...Object.keys(clientPackage.devDependencies),
    ];
    // A guard that can never match proves nothing: the lists must be the real ones.
    expect(declared).toContain('react');
    expect(declared).toContain('vite');
    expect(declared.filter((name) => CHART_LIBRARY.test(name))).toStrictEqual([]);
  });
});
