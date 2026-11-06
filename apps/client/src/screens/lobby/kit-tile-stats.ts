/**
 * The six stats a kit tile prints (technical spec v7 §7.3, §5.5; Appendix A `global-art-catalog`):
 * lives, points, upgrade points, Draw, and the starting action and attack card counts. Every value
 * is read from `KIT_CATALOG`, never from the art (the old Gambler PNG prints "?" for its Draw).
 * The one exception is a weighted-Draw kit, whose tile shows the range the server pays, not the
 * catalog's `draw` (designer 2026-11-03). L76-10.
 */

import { getKit, type KitId } from '@card-battle/shared';

import { RESOURCE_CAPTIONS } from '../../ui/resource-captions';
import type { KitTileStat } from '../../ui/primitives/kit-tile';

/**
 * The Draw a gambling kit shows (designer 2026-11-03): the weighted payout range of rules spec §4 /
 * Lot 64, the words of `KIT_ABILITY_COPY.gambler`.
 */
export const WEIGHTED_DRAW_LABEL = '5–100';

/**
 * Lives, points, upgrade points, Draw, action, attack: always these six, in this order, so no
 * `KitTile` key (its stat label) repeats. A kit is weighted when `traits.drawBustDenominator` is
 * set, the server's trigger for the weighted payout (`rollDrawGain`).
 */
export function kitTileStats(kitId: KitId): readonly KitTileStat[] {
  const { startingResources: resources, startingCardCounts: cards, traits } = getKit(kitId);
  return [
    { icon: 'life', label: RESOURCE_CAPTIONS.life, value: String(resources.lives) },
    { icon: 'point', label: RESOURCE_CAPTIONS.point, value: String(resources.points) },
    { icon: 'upgrade', label: RESOURCE_CAPTIONS.upgradePoint, value: String(resources.upgradePoints) },
    {
      icon: 'draw',
      label: 'Draw',
      value: traits.drawBustDenominator === undefined ? String(resources.draw) : WEIGHTED_DRAW_LABEL,
    },
    { icon: 'action', label: 'Action', value: String(cards.action) },
    { icon: 'attack', label: 'Attack', value: String(cards.attack) },
  ];
}
