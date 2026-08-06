/**
 * Player-facing card name for logs and pending chips.
 * Upgraded copies use the catalog "+" suffix (asset naming style).
 *
 * Effect copy: non-upgraded faces show base + upgrade preview; upgraded faces show
 * only the full upgraded description (`Card.upgradeEffect`).
 */

import type { Card, CardId } from './card';
import { getCard } from './card-catalog';

export function formatCardLabel(cardId: CardId, isUpgraded: boolean): string {
  const name = getCard(cardId)?.name ?? cardId;
  return isUpgraded ? `${name} +` : name;
}

/**
 * Player-facing effect text for a held copy.
 * Non-upgraded: base effect plus what the upgrade does. Upgraded: upgrade only.
 */
export function formatCardEffectText(card: Card, isUpgraded: boolean): string {
  if (isUpgraded) {
    return card.upgradeEffect;
  }

  return `${card.effect}\n\nUpgrade: ${card.upgradeEffect}`;
}
