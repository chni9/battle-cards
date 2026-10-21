import { describe, expect, it } from 'vitest';
import { collectGallerySections, type GalleryModule } from './gallery-registry';

const moduleFor = (id: string): GalleryModule => ({ gallery: { id, title: id, entries: [] } });

describe('collectGallerySections (technical spec v7 §4.2)', () => {
  it('returns every module section sorted by id, whatever the glob order', () => {
    const sections = collectGallerySections({
      '../ui/primitives/primitives.gallery.tsx': moduleFor('primitives'),
      '../ui/card/card.gallery.tsx': moduleFor('card'),
      '../ui/icons/icons.gallery.tsx': moduleFor('icons'),
    });
    expect(sections.map((section) => section.id)).toEqual(['card', 'icons', 'primitives']);
  });

  it('throws on a duplicate section id', () => {
    expect(() =>
      collectGallerySections({
        '../ui/icons/icons.gallery.tsx': moduleFor('icons'),
        '../ui/other/other.gallery.tsx': moduleFor('icons'),
      }),
    ).toThrow(/icons/);
  });

  it('returns an empty list for no modules', () => {
    expect(collectGallerySections({})).toEqual([]);
  });
});
