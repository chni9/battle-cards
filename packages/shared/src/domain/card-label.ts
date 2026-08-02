/**
 * Player-facing card name for logs and pending chips.
 * Upgraded copies use the catalog "+" suffix (asset naming style).
 */

import type { CardId } from './card';
import { getCard } from './card-catalog';

export function formatCardLabel(cardId: CardId, isUpgraded: boolean): string {
  const name = getCard(cardId)?.name ?? cardId;
  return isUpgraded ? `${name} +` : name;
}
