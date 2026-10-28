/**
 * Test-only builders of `/api/admin/*` wire payloads, typed by `@card-battle/shared` (L80-01).
 * Shipped code never imports this file. Later Lot 80 tasks append builders and never change an
 * existing default (plan Appendix A).
 */

import type {
  AdminGameDetail,
  AdminGameListItem,
  AdminGamesPage,
  AdminKitStatRow,
  AdminKitStats,
  AdminOverview,
} from '@card-battle/shared';

/** An Overview of an empty log: every count 0, every nullable null, every list empty. */
export function makeAdminOverview(overrides: Partial<AdminOverview> = {}): AdminOverview {
  return {
    gameCount: 0,
    humanOnlyCount: 0,
    withBotsCount: 0,
    avgDurationMs: null,
    avgDurationMsPerHumanPlayer: null,
    avgTurnSequence: null,
    topKitByWins: null,
    feedbackCount: 0,
    general: {
      gameCount: 0,
      humanOnlyCount: 0,
      withBotsCount: 0,
      avgDurationMs: null,
      medianDurationMs: null,
      avgDurationMsPerHumanPlayer: null,
      avgTurnSequence: null,
      avgClockMsPerTurn: null,
      avgOccupancy: null,
      durationByOpponentMix: [],
      durationByOccupancy: [],
      gamesByOccupancy: [],
      topKitByWins: null,
    },
    volume: { gamesByDay: [], gamesByHourUtc: [] },
    endings: {
      reasons: [],
      leaveRateByOccupancy: [],
      avgWinnerLives: null,
      winnerLivesBuckets: [],
      durationBuckets: [],
    },
    retention: { rematchGameCount: 0, rematchRate: null, distinctNicknames: 0 },
    feedbackPulse: { reportCount: 0, reportsPerGame: null, byKind: [] },
    gameplay: {
      actions: [],
      kits: [],
      kitSampleGames: 0,
      specialsPlayed: [],
      sharedCardsPlayed: [],
      avgThinkTimeMs: null,
      thinkTimePerActionMs: null,
      p50ThinkTimeMs: null,
      p90ThinkTimeMs: null,
      thinkTimeSeatCount: 0,
      actorSeatCount: 0,
      thinkTimePartial: false,
      drawShare: null,
    },
    economy: {
      shopMix: [],
      upgradeCardCount: 0,
      upgradedPlayCount: 0,
      playCardOrMultiCount: 0,
      upgradedPlayShare: null,
      avgLeftoverLives: null,
      avgLeftoverPoints: null,
      avgLeftoverUpgradePoints: null,
      avgBuyCount: null,
      avgSellCount: null,
      avgUpgradeCount: null,
      avgCardsPlayed: null,
    },
    combat: { livesLost: 0, shieldAbsorbed: 0, nonAttackLivesLost: 0, outcomes: [] },
    hidden: { spyPlays: 0, thiefPlays: 0, unspyCount: 0, mirrorRedirects: 0, persistents: [] },
    botsSeats: {
      mixedGameCount: 0,
      humanWinsInMixed: 0,
      humanWinRateInMixed: null,
      byBotDifficulty: [],
      seatWinShare: [],
    },
    ...overrides,
  };
}

/** A finished match of two humans: room code is the id upper-cased, no bots, not a tutorial. */
export function makeGameListItem(
  id: string,
  overrides: Partial<AdminGameListItem> = {},
): AdminGameListItem {
  return {
    id,
    roomId: id.toUpperCase(),
    endedAt: '2026-10-20T12:30:00.000Z',
    occupancy: 2,
    winnerNickname: null,
    winnerKitId: null,
    durationMs: 600_000,
    turnSequence: 12,
    hasBots: false,
    isTutorial: false,
    ...overrides,
  };
}

/** A page of the games list: page 1 of size 50, `total` the number of items given. */
export function makeGamesPage(
  items: readonly AdminGameListItem[],
  overrides: Partial<AdminGamesPage> = {},
): AdminGamesPage {
  return { items, page: 1, pageSize: 50, total: items.length, ...overrides };
}

/** A finished Classic match with two human seats, no eliminations and no action log. */
export function makeGameDetail(overrides: Partial<AdminGameDetail> = {}): AdminGameDetail {
  return {
    id: 'fg-1',
    roomId: 'ABCDEF',
    mode: 'classic',
    seed: 'seed-1',
    startedAt: '2026-10-20T12:20:00.000Z',
    endedAt: '2026-10-20T12:30:00.000Z',
    durationMs: 600_000,
    turnSequence: 12,
    hasBots: false,
    isTutorial: false,
    winnerPlayerId: 'p1',
    winnerNickname: 'Ana',
    seats: [
      {
        playerId: 'p1',
        seatIndex: 0,
        nickname: 'Ana',
        kitId: 'scientific',
        lives: 5,
        points: 3,
        isWinner: true,
        isEliminated: false,
        isBot: false,
      },
      {
        playerId: 'p2',
        seatIndex: 1,
        nickname: 'Ben',
        kitId: 'assassin',
        lives: 0,
        points: 1,
        isWinner: false,
        isEliminated: true,
        isBot: false,
      },
    ],
    eliminations: [],
    hasExportLog: false,
    ...overrides,
  };
}

/** The Kits payload: the rows given and the number of matches they are based on (0 by default). */
export function makeKitStats(rows: readonly AdminKitStatRow[], sampleGames = 0): AdminKitStats {
  return { sampleGames, rows };
}
