/**
 * V7 icon names — technical spec v7 §5.6 (resources, statuses, UI controls, in spec order,
 * including `unspy`, the crossed eye of L58-07), then five L72 additions that later Lot 72
 * components render: `clock` and `random` (L72-16), `close` (L72-09, L72-17) and the two
 * chevrons (L72-08).
 *
 * The list lives outside `icon.tsx` so that file exports components only (react-refresh).
 */

import type { ResourceKind } from '../asset-lookup';

export const ICON_NAMES = [
  // Resources (§5.1: a resource keeps its color everywhere).
  'life',
  'point',
  'upgrade',
  'shield',
  // Statuses.
  'spied-by-you',
  'spying-on-you',
  'shield-active',
  'block',
  'persistent',
  'invisibility',
  'reanimation-armed',
  'duplication-active',
  'eliminated',
  'bot',
  'disconnected',
  'absorb-window',
  'sentence-ticking',
  // UI controls.
  'menu',
  'shop',
  'draw',
  'unspy',
  'log',
  'help',
  'coach',
  'chat',
  'feedback',
  'flag',
  'sound',
  'vibration',
  'rules',
  'share',
  'copy',
  'minimize',
  // L72 additions beyond the §5.6 list.
  'clock',
  'close',
  'chevron-left',
  'chevron-right',
  'random',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/** The icon drawn beside each resource count (§5.1, §5.6). */
export const RESOURCE_ICON: Record<ResourceKind, IconName> = {
  life: 'life',
  point: 'point',
  upgradePoint: 'upgrade',
  shield: 'shield',
};

export function isIconName(value: string): value is IconName {
  return (ICON_NAMES as readonly string[]).includes(value);
}
