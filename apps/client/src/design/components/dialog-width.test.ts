import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { dialogPanelClassName, dialogPreferredMaxWidth } from './dialog-width';

describe('dialogPanelClassName (L53-02)', () => {
  it('caps the default 28rem width to the overlay so Cancel is not clipped', () => {
    const panel = dialogPanelClassName('');
    expect(dialogPreferredMaxWidth('')).toBe('28rem');
    expect(panel).toContain('min(28rem,100%)');
    expect(panel).not.toContain('max-w-3xl');
    expect(panel).toContain('min-w-0');
    expect(panel).toContain('max-h-full');
    expect(panel).toContain('my-auto');
    expect(panel).not.toContain('90dvh');
    expect(panel).not.toContain('100dvh');
    expect(panel).not.toContain('100vw');
  });

  it('does not emit max-w-md when the caller sets max-w-3xl', () => {
    const shop = dialogPanelClassName('max-w-3xl');
    expect(shop).toContain('min(48rem,100%)');
    expect(shop).not.toMatch(/(?:^|\s)max-w-md(?:\s|$)/);
    expect(shop).not.toMatch(/(?:^|\s)max-w-3xl(?:\s|$)/);
  });

  it('honors max-w-2xl and max-w-lg the same way', () => {
    expect(dialogPanelClassName('max-w-2xl')).toContain('min(42rem,100%)');
    expect(dialogPanelClassName('max-w-lg')).toContain('min(32rem,100%)');
    expect(dialogPreferredMaxWidth('max-w-lg extra')).toBe('32rem');
  });

  it('keeps the panel inside the overlay on short screens (L53-07)', () => {
    const panel = dialogPanelClassName('');
    expect(panel).toContain('max-h-full');
    expect(panel).not.toContain('90dvh');
  });

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
    expect(src).not.toContain('items-end');
    expect(src).not.toContain('items-center justify-center');
    expect(src).not.toContain('safe_center');
    expect(src).not.toContain('y: 28');
  });
});
