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
});
