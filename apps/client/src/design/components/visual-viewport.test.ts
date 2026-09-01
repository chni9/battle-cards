/**
 * Visible viewport lock — L53-07. The table fills the rectangle the player sees.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  VV_HEIGHT_VAR,
  VV_LEFT_VAR,
  VV_TOP_VAR,
  VV_WIDTH_VAR,
} from './visual-viewport';

const dir = dirname(fileURLToPath(import.meta.url));

describe('visual viewport lock (L53-07)', () => {
  it('exports CSS variable names the document root consumes', () => {
    expect(VV_WIDTH_VAR).toBe('--vv-width');
    expect(VV_HEIGHT_VAR).toBe('--vv-height');
    expect(VV_TOP_VAR).toBe('--vv-top');
    expect(VV_LEFT_VAR).toBe('--vv-left');
  });

  it('pins #root to the visual viewport instead of a stale 100dvh', () => {
    const css = readFileSync(join(dir, '../../index.css'), 'utf8');
    expect(css).toContain('--vv-width');
    expect(css).toContain('--vv-height');
    expect(css).toContain('position: fixed');
    const root = css.slice(css.indexOf('#root {'), css.indexOf('#root {') + 280);
    expect(root).toContain('var(--vv-width)');
    expect(root).toContain('var(--vv-height)');
    const main = readFileSync(join(dir, '../../main.tsx'), 'utf8');
    expect(main).toContain('applyVisualViewportCssVars');
    expect(main).toContain('subscribeVisualViewport');
    const shell = readFileSync(
      join(dir, '../../screens/table/table-shell.tsx'),
      'utf8',
    );
    expect(shell).toContain('h-full max-h-full w-full');
    expect(shell).not.toContain('100dvh');
    expect(shell).not.toContain('w-screen');
  });
});
