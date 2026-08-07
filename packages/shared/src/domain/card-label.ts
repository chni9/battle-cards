/**
 * Player-facing card name for logs and pending chips.
 * Upgraded copies use the catalog "+" suffix (asset naming style).
 *
 * Effect copy: non-upgraded faces show base + upgrade preview; upgraded faces show
 * only the full upgraded description (`Card.upgradeEffect`). Play cost is always
 * prefixed so Use dialogs stay clear about the price of use.
 */

import type { Card, CardCost, CardId } from './card';
import { getCard } from './card-catalog';

export function formatCardLabel(cardId: CardId, isUpgraded: boolean): string {
  const name = getCard(cardId)?.name ?? cardId;
  return isUpgraded ? `${name} +` : name;
}

/**
 * Formats a catalog `CardCost` for shop / play UI.
 * Empty or zero-valued costs return an empty string.
 */
export function formatCardCost(cost: CardCost): string {
  if (cost.pointsPerLife !== undefined && cost.pointsPerLife > 0) {
    return `${String(cost.pointsPerLife)} pts/life`;
  }

  if (cost.points !== undefined && cost.points > 0) {
    return `${String(cost.points)} ${cost.points === 1 ? 'pt' : 'pts'}`;
  }

  if (cost.lives !== undefined && cost.lives > 0) {
    return `${String(cost.lives)} ${cost.lives === 1 ? 'life' : 'lives'}`;
  }

  return '';
}

/**
 * Player-facing play cost for a held copy.
 * Regeneration's upgraded rate is 2 pts/life (rules §3); catalog `cost` stores the base 3.
 */
export function formatPlayCost(card: Card, isUpgraded: boolean): string {
  if (
    card.id === 'regeneration' &&
    isUpgraded &&
    card.cost.pointsPerLife !== undefined &&
    card.cost.pointsPerLife > 0
  ) {
    return '2 pts/life';
  }

  return formatCardCost(card.cost);
}

/**
 * Player-facing effect text for a held copy.
 * Always leads with Cost when the card has a play price. Non-upgraded: base effect
 * plus what the upgrade does. Upgraded: upgrade description only.
 */
export function formatCardEffectText(card: Card, isUpgraded: boolean): string {
  const cost = formatPlayCost(card, isUpgraded);
  const body = isUpgraded
    ? card.upgradeEffect
    : `${card.effect}\n\nUpgrade: ${card.upgradeEffect}`;

  if (cost.length === 0) {
    return body;
  }

  return `Cost: ${cost}\n\n${body}`;
}
