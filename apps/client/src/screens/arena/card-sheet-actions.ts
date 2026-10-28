/**
 * Card sheet action labels and costs — technical spec v7 §6.6.1 (the action row), §11 (Q39);
 * Lot 74 plan L74-08. Pure, so `card-sheet.tsx` exports components only (react-refresh).
 *
 * Costs come from the catalog, never from game state: the Use cost is the card's own cost chip
 * (`cardCostChip`), the Upgrade cost is one upgrade point, and the Sell yield is the catalog
 * `sellYield`.
 */

import { getCard, type CardInstance } from '@card-battle/shared';

import { structuredCostFromCardCost, type StructuredCost } from '../../ui/structured-cost';

/** V2 `screens/table/card-actions.tsx` label, verbatim (the arena never imports `screens/table/`). */
export const USE_ACTION_LABEL = 'Use';

/** V2 `screens/table/card-actions.tsx` labels, verbatim: the in-play Deactivate and its confirm's Cancel (Lot 69, L74-09). */
export const DEACTIVATE_ACTION_LABEL = 'Deactivate';
export const CANCEL_ACTION_LABEL = 'Cancel';

/** `upgrade-card.ts`: Upgrade costs one upgrade point. */
export const UPGRADE_ACTION_COST: StructuredCost = { kind: 'upgradePoint', amount: 1 };

/**
 * The catalog `sellYield`, as V2 shows it. An upgraded copy refunds an extra upgrade point that is
 * not shown here (V2 parity).
 */
export function sellYieldOf(instance: CardInstance): StructuredCost | null {
  return structuredCostFromCardCost(getCard(instance.cardId)?.sellYield);
}
