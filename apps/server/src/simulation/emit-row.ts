/**
 * Stable JSONL serialization for batch output — technical spec v3 §8 (L18-04).
 */

import type { SimulationGameRow } from './run-game';

/** Deterministic key order for byte-identical JSONL. */
export function serializeGameRow(row: SimulationGameRow): string {
  const ordered = {
    seed: row.seed,
    seatCount: row.seatCount,
    winnerPlayerId: row.winnerPlayerId,
    turnSequence: row.turnSequence,
    players: row.players.map((player) => ({
      playerId: player.playerId,
      seatIndex: player.seatIndex,
      kitId: player.kitId,
      isWinner: player.isWinner,
      isEliminated: player.isEliminated,
      lives: player.lives,
      points: player.points,
      upgradePoints: player.upgradePoints,
      shield: player.shield,
      shieldIsUpgraded: player.shieldIsUpgraded,
      cardsPlayedCount: player.cardsPlayedCount,
      cardsPlayedById: Object.fromEntries(
        Object.entries(player.cardsPlayedById).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
      buyCount: player.buyCount,
      sellCount: player.sellCount,
      upgradeCount: player.upgradeCount,
      isBot: player.isBot,
      botDifficulty: player.botDifficulty,
    })),
    eliminations: row.eliminations.map((entry) => ({
      playerId: entry.playerId,
      eliminatorPlayerId: entry.eliminatorPlayerId,
      reason: entry.reason,
    })),
  };

  return `${JSON.stringify(ordered)}\n`;
}
