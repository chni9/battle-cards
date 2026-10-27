/**
 * The DEV-only `/dev/ui` gallery (technical spec v7 §4.2): every `ui/` component on the V7
 * ground for the design gate and critiques. Sections come from each area's
 * `ui/<area>/<area>.gallery.tsx`, found with `import.meta.glob`, so no central list is edited.
 * `App.tsx` imports this module lazily behind `import.meta.env.DEV`, so production builds
 * carry neither the page nor its demo copy. html, body and #root clip their overflow
 * (index.css), so the ground root is the scroll container, as on Home: `h-full` and
 * `overflow-y-auto`, never `vh` or `dvh` (L53-02). Its halos then size to the visible box. It
 * is `relative`, like every scroll container: an absolutely positioned descendant (each
 * `sr-only` label) would otherwise escape its clip and grow `#root`, which cannot scroll back.
 */

import type { ReactElement } from 'react';
import { CHROME_FOCUS_CLASS, CHROME_OUTLINE_CLASS, CHROME_SHAPE_SM_CLASS } from '../ui/primitives/chrome-classes';
import { collectGallerySections, type GalleryModule } from './gallery-registry';

const SECTIONS = collectGallerySections(
  import.meta.glob<GalleryModule>('../ui/**/*.gallery.tsx', { eager: true }),
);

export function UiGallery(): ReactElement {
  return (
    <div className="relative v7-ground h-full overflow-y-auto overscroll-contain font-v7-body text-v7-text">
      <div className="mx-auto flex max-w-5xl min-w-0 flex-col gap-10 px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-3">
          <h1 className="font-v7-display text-v7-display leading-none">UI gallery</h1>
          <nav aria-label="Gallery sections">
            <ul className="flex flex-wrap gap-2">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={`inline-flex min-h-11 items-center bg-v7-panel-2 px-3 font-v7-display text-v7-body text-v7-text ${CHROME_SHAPE_SM_CLASS} ${CHROME_FOCUS_CLASS}`}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className="flex min-w-0 scroll-mt-4 flex-col gap-4"
          >
            <h2 id={`${section.id}-title`} className="font-v7-display text-v7-title leading-none">
              {section.title}
            </h2>
            {section.entries.map((entry) => (
              <article
                key={entry.id}
                id={`${section.id}-${entry.id}`}
                className={`flex min-w-0 flex-col gap-3 rounded-v7-chrome bg-v7-panel p-4 ${CHROME_OUTLINE_CLASS}`}
              >
                <h3 className="font-v7-display text-v7-body leading-none text-v7-text-2">{entry.title}</h3>
                {entry.render()}
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
