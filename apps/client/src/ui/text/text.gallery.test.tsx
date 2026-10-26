// @vitest-environment happy-dom
/**
 * `/dev/ui` text section — technical spec v7 §4.2, §6.6.1, L72-11. Every ui/ component appears in
 * the gallery; each entry here must draw at least one cost glyph.
 */

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
