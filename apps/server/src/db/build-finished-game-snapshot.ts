/**
 * Pure builder for the finished-game Postgres snapshot (technical spec §3, L8-01).
 */

import type { ActionLogEntryView, CardId } from '@card-battle/shared';

import type {
  BuildFinishedGameSnapshotInput,
  FinishedGamePlayerRecord,
  FinishedGameSnapshot,
} from './finished-game-types';

export function buildFinishedGameSnapshot(
  input: BuildFinishedGameSnapshotInput,
): FinishedGameSnapshot {
  const durationMs = input.endedAtMs - input.startedAtMs;

  return {
    roomId: input.roomId,
    mode: input.gameState.mode,
    seed: input.gameState.seed,
    winnerPlayerId: input.winnerPlayerId,
    turnSequence: input.gameState.turnSequence,
    startedAt: new Date(input.startedAtMs),
    endedAt: new Date(input.endedAtMs),
    durationMs,
    actionLog: input.actionLog,
    players: input.gameState.players.map((player, seatIndex) =>
      buildPlayerRecord(player, seatIndex, input.winnerPlayerId, input.actionLog),
    ),
    eliminations: input.eliminations,
  };
}

function buildPlayerRecord(
  player: BuildFinishedGameSnapshotInput['gameState']['players'][number],
  seatIndex: number,
  winnerPlayerId: string,
  actionLog: readonly ActionLogEntryView[],
): FinishedGamePlayerRecord {
  const aggregates = aggregateActionsForPlayer(player.id, actionLog);

  return {
    playerId: player.id,
    seatIndex,
    kitId: player.kitId,
    isWinner: player.id === winnerPlayerId,
    isEliminated: player.isEliminated,
    lives: player.lives,
    points: player.points,
    upgradePoints: player.upgradePoints,
    shield: player.shield,
    shieldIsUpgraded: player.shieldIsUpgraded,
    hand: player.hand,
    specialCards: player.specialCards,
    cardsPlayedCount: aggregates.cardsPlayedCount,
    cardsPlayedById: aggregates.cardsPlayedById,
    buyCount: aggregates.buyCount,
    sellCount: aggregates.sellCount,
    upgradeCount: aggregates.upgradeCount,
  };
}

function aggregateActionsForPlayer(
  playerId: string,
  actionLog: readonly ActionLogEntryView[],
): {
  cardsPlayedCount: number;
  cardsPlayedById: Record<string, number>;
  buyCount: number;
  sellCount: number;
  upgradeCount: number;
} {
  let cardsPlayedCount = 0;
  const cardsPlayedById: Record<string, number> = {};
  let buyCount = 0;
  let sellCount = 0;
  let upgradeCount = 0;

  for (const entry of actionLog) {
    if (entry.actorPlayerId !== playerId) {
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
