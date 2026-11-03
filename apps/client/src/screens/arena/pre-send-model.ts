/**
 * Pre-send choice model — technical spec v7 §6.6.2 (Regeneration quantity and Card Transformer
 * consume card are "chosen in the sheet before Use sends"); Appendix A
 * `regeneration-quantity-picker`, `card-transformer-consume-picker` (L74-10).
 *
 * The tiles themselves (quantities, prices, availability, consumable cards) come from
 * `cardActions(...).use` (L73); this file only names them and keeps the consume pick valid.
 */

import type { CardInstance } from '@card-battle/shared';

import { costAriaLabel } from '../../ui/structured-cost';
import type { RegenerationQuantity, RegenerationTile } from '../../view-model/card-actions';

/** The V2 Regeneration dialog title, reused as the tile group's name. */
export const REGENERATION_GROUP_LABEL = 'Regeneration quantity';

/** The V2 Card Transformer dialog title, reused as the tile group's name. */
export const CONSUME_GROUP_LABEL = 'Choose a card to transform';

/** '1 life' is preselected (designer Appendix B Q16), mirroring Card Transformer's first card. */
export const DEFAULT_REGENERATION_QUANTITY: RegenerationQuantity = 1;

/** The tile's accessible name: its label, then its spoken price ('3 lives, minus 9 pts'). */
export function regenerationTileLabel(tile: RegenerationTile): string {
  return `${tile.label}, ${costAriaLabel({ kind: 'points', amount: tile.totalCost }, 'cost')}`;
}

/** The picked consume card while it is still offered, else the first option (V2), else null. */
export function resolveConsumeId(options: readonly CardInstance[], picked: string | null): string | null {
  if (picked !== null && options.some((option) => option.instanceId === picked)) {
    return picked;
  }
  return options[0]?.instanceId ?? null;
}
