import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { dialogPanelClassName } from './dialog-width';

describe('dialogPanelClassName (L53-02)', () => {
  it('keeps max-w-md when the caller does not set a width', () => {
    expect(dialogPanelClassName('')).toContain('max-w-md');
    expect(dialogPanelClassName('')).not.toContain('max-w-3xl');
  });

  it('does not emit max-w-md when the caller sets max-w-3xl', () => {
    const shop = dialogPanelClassName('max-w-3xl');
    expect(shop).toContain('max-w-3xl');
    expect(shop).not.toMatch(/(?:^|\s)max-w-md(?:\s|$)/);
  });

  it('honors max-w-2xl and max-w-lg the same way', () => {
    expect(dialogPanelClassName('max-w-2xl')).not.toMatch(/(?:^|\s)max-w-md(?:\s|$)/);
    expect(dialogPanelClassName('max-w-lg')).toContain('max-w-lg');
  });

  it('keeps the panel inside the viewport on short screens (L53-07)', () => {
    const panel = dialogPanelClassName('');
    expect(panel).toContain('max-h-[calc(100dvh-1rem)]');
    expect(panel).not.toContain('90dvh');
  });

  it('drops sm padding on short viewports so Close stays in 390px height', () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../index.css'),
      'utf8',
    );
    expect(css).toContain('max-height: 500px');
    expect(css).toContain('[role="dialog"]');
    expect(css).toContain('padding: 0.5rem !important');
  });

  it('centers the overlay instead of pinning it to the bottom', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'dialog.tsx'),
      'utf8',
    );
    expect(src).toContain('items-center');
    expect(src).not.toContain('items-end');
  });
});
