import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('admin charts (L62-05)', () => {
  it('uses CSS/SVG tokens and does not import a chart library', () => {
    const source = readFileSync(join(here, 'admin-charts.tsx'), 'utf8');
    expect(source).toContain('conicGradientFromSlices');
    expect(source).toContain('scatterPlotXY');
    expect(source).toContain('var(--color-cta-purple)');
    const imports = source
      .split('\n')
      .filter((line) => line.startsWith('import'))
      .join('\n');
    expect(imports).not.toMatch(/chart\.js|recharts|victory|nivo|plotly/i);
    expect(source).not.toMatch(/from ['"]chart/i);
  });
});
