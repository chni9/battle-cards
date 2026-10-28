/**
 * Test-only builders of `/api/admin/*` wire payloads, typed by `@card-battle/shared` (L80-01).
 * Shipped code never imports this file. Later Lot 80 tasks append builders and never change an
 * existing default (plan Appendix A).
 */

import type { AdminOverview } from '@card-battle/shared';

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
