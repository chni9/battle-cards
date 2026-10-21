/**
 * Dialog overlay sizing — L53-02 / L53-07.
 * Dialog part, split from design/components/dialog-width.test.ts by owner lot (technical spec v7 §12.1, L72-02).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

describe('dialogPanelClassName (L53-02)', () => {
  it('drops extra padding on short viewports so Close stays in 390px height', () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../index.css'),
      'utf8',
    );
    expect(css).toContain('max-height: 500px');
    expect(css).toContain('[role="dialog"]');
    expect(css).toContain('max-height: 100%');
    expect(css).toContain('padding: 0.5rem !important');
    expect(css).toContain('min-width: 0');
  });

  it('pins the overlay to the start so a tall panel is not clipped at the top', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'dialog.tsx'),
      'utf8',
    );
    expect(src).toContain('items-start');
    expect(src).toContain('overflow-x-hidden');
    expect(src).toContain("maxHeight: '100%'");
    expect(src).toContain('dialogPreferredMaxWidth');
    expect(src).toContain('readVisualViewportBox');
    expect(src).toContain('visualViewport');
    expect(src).not.toContain('items-end');
    expect(src).not.toContain('items-center justify-center');
    expect(src).not.toContain('safe_center');
    expect(src).not.toContain('y: 28');
    expect(src).not.toContain('inset-0');
  });
});
