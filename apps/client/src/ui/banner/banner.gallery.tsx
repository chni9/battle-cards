/**
 * `/dev/ui` section for the L72-18 table banners (technical spec v7 §4.2, §6.12, §8.1): one
 * `BannerDemo` per banner kind, each played on demand with its own Play button. Titles reuse the
 * locked cue copy. DEV only. No PascalCase local component lives here:
 * `react-refresh/only-export-components` would report the `gallery` export beside one.
 */

import type { GallerySection } from '../../dev/gallery-registry';
import { TABLE_BANNER_COPY } from '../../view-model/table-banner';
import { v7SeatColor } from '../palette';
import { BannerDemo } from './banner-demo';

export const gallery: GallerySection = {
  id: 'banner',
  title: 'Table banners',
  entries: [
    { id: 'turn', title: TABLE_BANNER_COPY.turn, render: () => <BannerDemo kind="turn" seatColor={v7SeatColor(0)} /> },
    { id: 'attacked', title: TABLE_BANNER_COPY.attacked, render: () => <BannerDemo kind="attacked" /> },
    { id: 'dead', title: TABLE_BANNER_COPY.dead, render: () => <BannerDemo kind="dead" /> },
    { id: 'won', title: TABLE_BANNER_COPY.won, render: () => <BannerDemo kind="won" seatColor={v7SeatColor(3)} /> },
    { id: 'sentence', title: 'Sentence countdown', render: () => <BannerDemo kind="sentence" /> },
    { id: 'wipe', title: 'Own Gambler wipe', render: () => <BannerDemo kind="wipe" /> },
  ],
};
