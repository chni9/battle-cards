/** `/dev/ui` section for the L72-08 primitives (technical spec v7 §4.2). DEV only. */

import type { GallerySection } from '../../dev/gallery-registry';
import {
  AvatarDemo,
  BadgeDemo,
  ButtonDemo,
  CarouselDemo,
  IconButtonDemo,
  KitTileDemo,
  PillDemo,
  ScrollAreaDemo,
  SegmentedDemo,
  SliderDemo,
  TabsDemo,
  TextFieldDemo,
  ToggleDemo,
  TooltipDemo,
} from './primitives-gallery-demos';

export const gallery: GallerySection = {
  id: 'primitives',
  title: 'Primitives',
  entries: [
    { id: 'button', title: 'Button', render: () => <ButtonDemo /> },
    { id: 'icon-button', title: 'IconButton', render: () => <IconButtonDemo /> },
    { id: 'pill', title: 'Pill', render: () => <PillDemo /> },
    { id: 'badge', title: 'Badge', render: () => <BadgeDemo /> },
    { id: 'avatar', title: 'Avatar', render: () => <AvatarDemo /> },
    { id: 'tabs', title: 'Tabs', render: () => <TabsDemo /> },
    { id: 'segmented', title: 'Segmented', render: () => <SegmentedDemo /> },
    { id: 'slider', title: 'Slider', render: () => <SliderDemo /> },
    { id: 'toggle', title: 'Toggle', render: () => <ToggleDemo /> },
    { id: 'tooltip', title: 'Tooltip', render: () => <TooltipDemo /> },
    { id: 'scroll-area', title: 'ScrollArea', render: () => <ScrollAreaDemo /> },
    { id: 'text-field', title: 'TextField', render: () => <TextFieldDemo /> },
    { id: 'carousel', title: 'Carousel', render: () => <CarouselDemo /> },
    { id: 'kit-tile', title: 'KitTile', render: () => <KitTileDemo /> },
  ],
};
