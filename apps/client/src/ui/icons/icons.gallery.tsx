/**
 * `/dev/ui` section for the V7 icon set (technical spec v7 §5.6, L72-07): every `ICON_NAMES`
 * glyph at 32 px with its name, and the labelled form that keeps help and coach apart (Q45).
 * DEV only.
 */

import type { GallerySection } from '../../dev/gallery-registry';
import { Icon } from './icon';
import { ICON_NAMES } from './icon-names';

export const gallery: GallerySection = {
  id: 'icons',
  title: 'Icons',
  entries: [
    {
      id: 'set',
      title: 'Icon set',
      render: () => (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
          {ICON_NAMES.map((name) => (
            <li
              key={name}
              className="flex flex-col items-center gap-1.5 rounded-v7-chrome-sm bg-v7-bg-0 px-1 py-2 text-center"
            >
              <Icon name={name} size={32} />
              <span className="font-v7-body text-v7-micro font-extrabold break-all text-v7-text-2">{name}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'labelled',
      title: 'Labelled icons',
      render: () => (
        <div className="flex flex-wrap items-center gap-6">
          <span className="inline-flex items-center gap-2 font-v7-body text-v7-body font-bold text-v7-text">
            <Icon name="help" size={32} label="Help" />
            <span aria-hidden="true">Help</span>
          </span>
          <span className="inline-flex items-center gap-2 font-v7-body text-v7-body font-bold text-v7-text">
            <Icon name="coach" size={32} label="Coach" />
            <span aria-hidden="true">Coach</span>
          </span>
        </div>
      ),
    },
  ],
};
