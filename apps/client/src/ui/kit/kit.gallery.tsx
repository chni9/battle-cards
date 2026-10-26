/**
 * `/dev/ui` section for the L72-15 kit portrait and kit details (technical spec v7 §4.2, §5.5,
 * §6.6.5): the four faces, the four sizes, every kit at tile size, and the details of four kits
 * that exercise the sections (Scientific: always upgraded and a special cost; Specialist:
 * duplicate specials; Gambler: catalog values and the draw risk; Prophet: no special cards). The
 * labels are DEV-only demo copy. DEV only.
 *
 * No PascalCase local component lives here: `react-refresh/only-export-components` would report
 * the `gallery` export beside one. The frames are plain functions that return JSX.
 */

import { KIT_IDS, getKit, type KitId } from '@card-battle/shared';
import type { ReactElement, ReactNode } from 'react';
import type { GallerySection } from '../../dev/gallery-registry';
import { KitDetails } from './kit-details';
import { KitPortrait } from './kit-portrait';

const LABEL_CLASS = 'font-v7-body text-v7-caption font-bold text-v7-text-2';

function row(children: ReactNode): ReactElement {
  return <div className="flex flex-wrap items-end gap-x-4 gap-y-6 pt-1 pb-2">{children}</div>;
}

function labelled(label: string, sample: ReactNode): ReactElement {
  return (
    <div key={label} className="flex flex-col items-center gap-3">
      {sample}
      <p className={LABEL_CLASS}>{label}</p>
    </div>
  );
}

/** The kit sheet's body is on `--panel`, in a phone-width column. */
function sheetBody(kitId: KitId): ReactElement {
  return (
    <div className="max-w-md rounded-v7-chrome-sm bg-v7-panel">
      <KitDetails kitId={kitId} />
    </div>
  );
}

export const gallery: GallerySection = {
  id: 'kit',
  title: 'Kit',
  entries: [
    {
      id: 'portrait-faces',
      title: 'Portrait faces (tile)',
      render: () =>
        row([
          labelled('art', <KitPortrait kitId="scientific" size="tile" />),
          labelled('hidden', <KitPortrait kitId={null} size="tile" />),
          labelled('random', <KitPortrait kitId="random" size="tile" />),
          labelled('eliminated', <KitPortrait kitId="scientific" size="tile" isEliminated />),
        ]),
    },
    {
      id: 'portrait-sizes',
      title: 'Portrait sizes (Gambler)',
      render: () =>
        row(
          (['thumb', 'tile', 'sheet', 'hero'] as const).map((size) =>
            labelled(size, <KitPortrait kitId="gambler" size={size} />),
          ),
        ),
    },
    {
      id: 'portrait-roster',
      title: 'Every kit (tile)',
      render: () =>
        row(KIT_IDS.map((kitId) => labelled(getKit(kitId).name, <KitPortrait kitId={kitId} size="tile" />))),
    },
    { id: 'details-scientific', title: 'Details: Scientific', render: () => sheetBody('scientific') },
    { id: 'details-specialist', title: 'Details: Specialist (duplicate specials)', render: () => sheetBody('specialist') },
    { id: 'details-gambler', title: 'Details: Gambler (catalog values)', render: () => sheetBody('gambler') },
    { id: 'details-prophet', title: 'Details: Prophet (no special cards)', render: () => sheetBody('prophet') },
  ],
};
