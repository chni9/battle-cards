/**
 * `/dev/ui` gallery sections (technical spec v7 §4.2). Each `ui/` area exports
 * `gallery: GallerySection` from `ui/<area>/<area>.gallery.tsx`; `dev/ui-gallery.tsx` finds them
 * with `import.meta.glob`, so adding a section never edits a central list. Ids must be unique.
 */

import type { ReactNode } from 'react';

export interface GalleryEntry {
  readonly id: string;
  readonly title: string;
  readonly render: () => ReactNode;
}

export interface GallerySection {
  readonly id: string;
  readonly title: string;
  readonly entries: readonly GalleryEntry[];
}

export interface GalleryModule {
  readonly gallery: GallerySection;
}

/** Every module's section, sorted by id so the page order never depends on the glob order. */
export function collectGallerySections(modules: Readonly<Record<string, GalleryModule>>): readonly GallerySection[] {
  const sections = Object.values(modules).map((module) => module.gallery);
  const seen = new Set<string>();
  for (const { id } of sections) {
    if (seen.has(id)) throw new Error(`Duplicate /dev/ui gallery section id "${id}"`);
    seen.add(id);
  }
  return [...sections].sort((a, b) => a.id.localeCompare(b.id));
}
