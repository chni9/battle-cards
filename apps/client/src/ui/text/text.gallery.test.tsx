// @vitest-environment happy-dom
/** text gallery section — technical spec v7 §6.6.1 (L72-11). */
import { describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { gallery } from './text.gallery';

describe('text gallery section (L72-11)', () => {
  it('registers the text section and renders a cost glyph in every entry', () => {
    expect(gallery.id).toBe('text');
    const ids = gallery.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['cost-amount', 'effect-text', 'card-effect-copy']);
    for (const entry of gallery.entries) {
      const { container, unmount } = renderUi(<>{entry.render()}</>);
      expect(container.querySelector('[data-glyph-icon]')).not.toBeNull();
      unmount();
    }
  });
});
