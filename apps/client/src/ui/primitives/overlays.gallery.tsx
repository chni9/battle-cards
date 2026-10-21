/** `/dev/ui` section for the L72-09 overlays: Sheet, Dialog and Toast (technical spec v7 §4.2). DEV only. */

import type { GallerySection } from '../../dev/gallery-registry';
import { BlockingSheetDemo, DialogDemo, ReadOnlyStackDemo, ToastDemo } from './overlays.gallery-demos';

export const gallery: GallerySection = {
  id: 'overlays',
  title: 'Overlays',
  entries: [
    { id: 'read-only-stack', title: 'Read-only stack', render: () => <ReadOnlyStackDemo /> },
    { id: 'blocking-sheet', title: 'Blocking sheet', render: () => <BlockingSheetDemo /> },
    { id: 'dialog', title: 'Dialog', render: () => <DialogDemo /> },
    { id: 'toast', title: 'Toast', render: () => <ToastDemo /> },
  ],
};
