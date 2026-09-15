/**
 * Play-only aggregates from the public action log — L8 finished-game metrics,
 * L9-03 recap, L60-04 award counts.
 * `actionPlayed` drives play / buy / sell / upgrade / draw / attack / special
 * totals. `actionResolved` attack `livesLost` is damage dealt. Combat
 * `playerEliminated` rows are kills. Resolutions / Mirror / rewards never
 * inflate play counts.
 */

import {
  isAttackCardId,
  isSpecialCardId,
  type ActionLogEntryView,
  type CardId,
} from '@card-battle/shared';

export interface ActionLogPlayerAggregates {
  cardsPlayedCount: number;
  cardsPlayedById: Readonly<Record<string, number>>;
  buyCount: number;
  sellCount: number;
  upgradeCount: number;
  specialsPlayedCount: number;
  /** `buyCard` + `buySpecialCard` + `buyPoolCard` — not `buyUpgradePoint`. */
  buyCardCount: number;
  /** `sellCard` only — not `sellUpgradePoint`. */
  sellCardCount: number;
  /** Real `draw` — not opaque `activateDuplication`. */
  drawCount: number;
  attacksPlayedCount: number;
  /** Attack-source `actionResolved.livesLost` — not Tax / Suicide. */
  damageDealt: number;
  /** Combat eliminations credited to this seat. */
  kills: number;
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
  let specialsPlayedCount = 0;
  let buyCardCount = 0;
  let sellCardCount = 0;
  let drawCount = 0;
  let attacksPlayedCount = 0;
  let damageDealt = 0;
  let kills = 0;

  for (const entry of actionLog) {
    if (entry.kind === 'actionResolved') {
      if (entry.sourcePlayerId === playerId && isAttackCardId(entry.cardId)) {
        damageDealt += entry.livesLost;
      }

      continue;
    }

    if (entry.kind === 'playerEliminated') {
      if (entry.reason === 'combat' && entry.eliminatorPlayerId === playerId) {
        kills += 1;
      }

      continue;
    }

    if (entry.kind !== 'actionPlayed' || entry.actorPlayerId !== playerId) {
      continue;
    }

    switch (entry.action) {
      case 'playCard': {
        cardsPlayedCount += 1;
        bumpCardCount(cardsPlayedById, entry.cardId);

        if (entry.cardId !== undefined) {
          if (isSpecialCardId(entry.cardId)) {
            specialsPlayedCount += 1;
          }

          if (isAttackCardId(entry.cardId)) {
            attacksPlayedCount += 1;
          }
        }

        break;
      }
      case 'playMultipleAttacks': {
        const attacks = entry.attacks;

        if (attacks === undefined || attacks.length === 0) {
          cardsPlayedCount += 1;
          attacksPlayedCount += 1;
          break;
        }

        cardsPlayedCount += attacks.length;
        attacksPlayedCount += attacks.length;

        for (const attack of attacks) {
          bumpCardCount(cardsPlayedById, attack.cardId);

          if (isSpecialCardId(attack.cardId)) {
            specialsPlayedCount += 1;
          }
        }

        break;
      }
      case 'buyCard':
      case 'buySpecialCard':
      case 'buyPoolCard': {
        buyCount += 1;
        buyCardCount += 1;
        break;
      }
      case 'buyUpgradePoint': {
        buyCount += 1;
        break;
      }
      case 'sellCard': {
        sellCount += 1;
        sellCardCount += 1;
        break;
      }
      case 'sellUpgradePoint': {
        sellCount += 1;
        break;
      }
      case 'upgradeCard': {
        upgradeCount += 1;
        break;
      }
      case 'draw': {
        drawCount += 1;
        break;
      }
      case 'deactivatePersistent':
      case 'activateDuplication':
      case 'clearSpy': {
        break;
      }
      default: {
        const _exhaustive: never = entry.action;
        void _exhaustive;
      }
    }
  }

  return {
    cardsPlayedCount,
    cardsPlayedById,
    buyCount,
    sellCount,
    upgradeCount,
    specialsPlayedCount,
    buyCardCount,
    sellCardCount,
    drawCount,
    attacksPlayedCount,
    damageDealt,
    kills,
  };
}

function bumpCardCount(map: Record<string, number>, cardId: CardId | undefined): void {
  if (cardId === undefined) {
    return;
  }

  const current = map[cardId];
  map[cardId] = (current ?? 0) + 1;
}
