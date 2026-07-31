/**
 * Pure builder for the finished-game Postgres snapshot (technical spec §3, L8-01).
 */

import type { ActionLogEntryView } from '@card-battle/shared';

import { aggregateActionsForPlayer } from './aggregate-action-log';
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
