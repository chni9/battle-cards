/**
 * Shop sheet copy and labels — technical spec v7 §6.8; Lot 74 plan Appendix A `shop-dialog`
 * (L74-14).
 *
 * The strings are the V2 `screens/table/shop-dialog.tsx` copy, reused verbatim: the arena never
 * imports `screens/table/` (L74-01 import rule), so they are restated here, not new strings.
 */

import { getCard } from '@card-battle/shared';

import { costAriaLabel } from '../../ui/structured-cost';
import { SHOP_SECTION_POOL } from '../../view-model/chrome-labels';
import type { ShopCardTile } from '../../view-model/shop';

/** V2's pool explainer (`shop-dialog.tsx`). */
export const POOL_BLURB = 'Cards deactivated or dumped here are visible to every player. This is not a hand.';
/** V2's empty-pool line. */
export const POOL_EMPTY_COPY = 'The pool is empty.';
/** V2's Shop close button. */
export const SHOP_CLOSE_LABEL = 'Close';

function tileName(tile: ShopCardTile): string {
  return getCard(tile.cardId)?.name ?? tile.cardId;
}

/** V2 tile label: `{name}[ upgraded], {spoken price | 'no price'}[, cannot afford]`. */
export function shopTileLabel(tile: ShopCardTile): string {
  const price = costAriaLabel(tile.cost, 'cost');
  return `${tileName(tile)}${tile.instance.isUpgraded ? ' upgraded' : ''}, ${price.length > 0 ? price : 'no price'}${tile.affordable ? '' : ', cannot afford'}`;
}

/** `Inspect {name}`: V2's inspect-chip words (threat-copy.ts). */
export function shopInspectLabel(tile: ShopCardTile): string {
  return `Inspect ${tileName(tile)}`;
}

/** `Pool ({count})`: the V2 pool heading. */
export function poolHeading(count: number): string {
  return `${SHOP_SECTION_POOL} (${String(count)})`;
}
