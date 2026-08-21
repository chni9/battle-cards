/**
 * Resource caption copy — technical spec v6 §6.1 / L43-01.
 * Kept out of the ResourceIcon component file so Fast Refresh stays valid.
 */

import type { ResourceKind } from '../asset-lookup';

export const RESOURCE_CAPTIONS: Record<ResourceKind, string> = {
  life: 'Lives',
  point: 'Points',
  shield: 'Shield',
  upgradePoint: 'Upgrade points',
};

/** Visible word next to the icon on the dock; sr-only elsewhere. */
export function resourceCaptionMode(
  captionVisible: boolean | undefined,
): 'visible' | 'sr-only' {
  return captionVisible === true ? 'visible' : 'sr-only';
}
