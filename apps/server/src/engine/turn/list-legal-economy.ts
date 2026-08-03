/**
 * Enumerate legal economy turn actions — technical spec v3 §4.3 (L16-01).
 *
 * Affordability via existing `canAffordCost` / economy constants; no re-derived rules.
 */

import {
  getSharedCard,
  SHARED_CARD_IDS,
  UPGRADE_POINT_ECONOMY,
  type Player,
} from '@card-battle/shared';

import { SPECIAL_CARD_PURCHASE_COST } from '../economy/buy-special-card';
import { canAffordCost } from '../economy/transfers';
import type { TurnAction } from './perform-action';

export function listLegalEconomyActions(actor: Player): readonly TurnAction[] {
  const actions: TurnAction[] = [];

  for (const cardId of SHARED_CARD_IDS) {
    const definition = getSharedCard(cardId);

    if (definition === undefined) {
      continue;
    }

    if (canAffordCost(actor, definition.buyCost)) {
      actions.push({ type: 'buyCard', cardId });
    }
  }

  for (const instance of actor.hand) {
    if (getSharedCard(instance.cardId) !== undefined) {
      actions.push({ type: 'sellCard', instanceId: instance.instanceId });
    }
  }

  if (actor.upgradePoints >= 1) {
    for (const instance of [...actor.hand, ...actor.specialCards]) {
      if (!instance.isUpgraded) {
        actions.push({ type: 'upgradeCard', instanceId: instance.instanceId });
      }
    }
  }

  if (actor.points >= UPGRADE_POINT_ECONOMY.buyCostPoints) {
    actions.push({ type: 'buyUpgradePoint' });
  }

  if (actor.upgradePoints >= 1) {
    actions.push({ type: 'sellUpgradePoint' });
  }

  if (actor.points >= SPECIAL_CARD_PURCHASE_COST) {
    actions.push({ type: 'buySpecialCard' });
  }

  return actions;
}
