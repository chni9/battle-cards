/**
 * Tutorial callout + hovering coach chrome — technical spec v6 §5.4.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('tutorial callout chrome (technical spec v6 §5.4)', () => {
  it('defines a pulse animation and pointing arrows', () => {
    const css = readFileSync(join(here, '../../index.css'), 'utf8');
    expect(css).toContain('@keyframes tutorial-pulse');
    expect(css).toContain('tutorial-callout-arrow');
    expect(css).toContain('prefers-reduced-motion');
  });

  it('coach overlay can hide and reopen', () => {
    const src = readFileSync(join(here, 'tutorial-coach.tsx'), 'utf8');
    expect(src).toContain('onHide');
    expect(src).toContain('onShow');
    expect(src).toContain('OPEN_COACH_LABEL');
    expect(src).toContain('HIDE_COACH_ARIA_LABEL');
    expect(src).toContain('z-[110]');
    expect(src).not.toContain('non-dismissible');
  });
});
