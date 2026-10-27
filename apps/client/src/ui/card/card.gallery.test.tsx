// @vitest-environment happy-dom
/**
 * `/dev/ui` card section — technical spec v7 §4.2: every ui/ component appears in the gallery,
 * and each card entry must draw at least one card face.
 */

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
