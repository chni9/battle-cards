// @vitest-environment happy-dom
/** Card gallery — technical spec v7 §4.2. */
import { describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { gallery } from './card.gallery';

describe('card gallery (/dev/ui)', () => {
  it('registers the card section and renders a card in every entry', () => {
    expect(gallery.id).toBe('card');
    const ids = gallery.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(gallery.entries.length);
    for (const entry of gallery.entries) {
      const { container, unmount } = renderUi(<>{entry.render()}</>);
      expect(container.querySelector('[data-card-face]')).not.toBeNull();
      unmount();
    }
  });
});
