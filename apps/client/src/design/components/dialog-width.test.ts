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
});
