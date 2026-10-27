// @vitest-environment happy-dom
/**
 * `/dev/ui` kit section — technical spec v7 §4.2: every ui/ component appears in the gallery.
 * Each entry must draw at least one kit portrait (the details entries carry one in their header).
 */

import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { gallery } from './kit.gallery';

describe('kit gallery section', () => {
  it('registers the kit section with its entries', () => {
    expect(gallery.id).toBe('kit');
    expect(gallery.entries.map((entry) => entry.id)).toEqual([
      'portrait-faces',
      'portrait-sizes',
      'portrait-roster',
      'details-scientific',
      'details-specialist',
      'details-gambler',
      'details-prophet',
    ]);
  });

  it.each(gallery.entries)('renders the $id entry', (entry) => {
    const { container } = renderUi(<>{entry.render()}</>);
    expect(container.querySelector('[data-zone="kit-portrait"]')).not.toBeNull();
  });
});
