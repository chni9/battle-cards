/**
 * Play-only aggregates from the public action log — L8 finished-game metrics, L9-03 recap.
 * Counts only `kind: 'actionPlayed'` entries so resolutions / elims / Mirror / rewards
 * never inflate play / buy / sell / upgrade totals.
 */

import type { ActionLogEntryView, CardId } from '@card-battle/shared';

export interface ActionLogPlayerAggregates {
  cardsPlayedCount: number;
  cardsPlayedById: Readonly<Record<string, number>>;
  buyCount: number;
  sellCount: number;
  upgradeCount: number;
}

export function aggregateActionsForPlayer(
  playerId: string,
  actionLog: readonly ActionLogEntryView[],
): ActionLogPlayerAggregates {
  let cardsPlayedCount = 0;
  const cardsPlayedById: Record<string, number> = {};
  let buyCount = 0;
  let sellCount = 0;
  let upgradeCount = 0;

  for (const entry of actionLog) {
    if (entry.kind !== 'actionPlayed' || entry.actorPlayerId !== playerId) {
      continue;
    }

    switch (entry.action) {
      case 'playCard': {
        cardsPlayedCount += 1;
        bumpCardCount(cardsPlayedById, entry.cardId);
        break;
      }
      case 'playMultipleAttacks': {
        const attacks = entry.attacks;

        if (attacks === undefined || attacks.length === 0) {
          cardsPlayedCount += 1;
          break;
        }

        cardsPlayedCount += attacks.length;

        for (const attack of attacks) {
          bumpCardCount(cardsPlayedById, attack.cardId);
        }

        break;
      }
      case 'buyCard':
      case 'buySpecialCard':
      case 'buyUpgradePoint': {
        buyCount += 1;
        break;
      }
      case 'sellCard':
      case 'sellUpgradePoint': {
        sellCount += 1;
        break;
      }
      case 'upgradeCard': {
        upgradeCount += 1;
        break;
      }
      case 'draw': {
        break;
      }
    }
  }

  return {
    cardsPlayedCount,
    cardsPlayedById,
    buyCount,
    sellCount,
    upgradeCount,
  };
}

function bumpCardCount(map: Record<string, number>, cardId: CardId | undefined): void {
  if (cardId === undefined) {
    return;
  }

  const current = map[cardId];
  map[cardId] = (current ?? 0) + 1;
}
