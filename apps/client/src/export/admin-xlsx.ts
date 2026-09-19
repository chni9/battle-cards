/**
 * Client-side Excel exports for admin views (Lot 61).
 */

import type {
  AdminGameListItem,
  AdminKitStatRow,
  AdminOverview,
  AdminTablePage,
} from '@card-battle/shared';
import ExcelJS from 'exceljs';

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportGamesListXlsx(
  items: readonly AdminGameListItem[],
  filename = 'admin-games.xlsx',
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Games');
  sheet.columns = [
    { header: 'Code', key: 'roomId', width: 10 },
    { header: 'Ended', key: 'endedAt', width: 22 },
    { header: 'Seats', key: 'occupancy', width: 8 },
    { header: 'Winner', key: 'winnerNickname', width: 16 },
    { header: 'Kit', key: 'winnerKitId', width: 14 },
    { header: 'Duration ms', key: 'durationMs', width: 12 },
    { header: 'Turns', key: 'turnSequence', width: 8 },
    { header: 'Bots', key: 'hasBots', width: 8 },
    { header: 'Tutorial', key: 'isTutorial', width: 10 },
  ];
  for (const item of items) {
    sheet.addRow({
      roomId: item.roomId,
      endedAt: item.endedAt,
      occupancy: item.occupancy,
      winnerNickname: item.winnerNickname ?? '',
      winnerKitId: item.winnerKitId ?? '',
      durationMs: item.durationMs,
      turnSequence: item.turnSequence,
      hasBots: item.hasBots,
      isTutorial: item.isTutorial,
    });
  }
  await downloadWorkbook(workbook, filename);
}

export async function exportKitStatsXlsx(
  rows: readonly AdminKitStatRow[],
  filename = 'admin-kit-stats.xlsx',
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Kits');
  sheet.columns = [
    { header: 'Kit', key: 'kitId', width: 16 },
    { header: 'Picks', key: 'picks', width: 10 },
    { header: 'Wins', key: 'wins', width: 10 },
    { header: 'Pick rate', key: 'pickRate', width: 12 },
    { header: 'Win rate', key: 'winRate', width: 12 },
  ];
  for (const row of rows) {
    sheet.addRow({
      kitId: row.kitId,
      picks: row.picks,
      wins: row.wins,
      pickRate: row.pickRate,
      winRate: row.winRate,
    });
  }
  await downloadWorkbook(workbook, filename);
}

export async function exportTablePageXlsx(
  page: AdminTablePage,
  filename = `admin-${page.table}.xlsx`,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(page.table.slice(0, 31));
  const headers = page.columns.map((col) => col.name);
  sheet.addRow(headers);
  for (const row of page.rows) {
    sheet.addRow(headers.map((key) => stringifyCell(row[key])));
  }
  await downloadWorkbook(workbook, filename);
}

export async function exportOverviewXlsx(
  overview: AdminOverview,
  filename = 'admin-overview.xlsx',
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  const general = workbook.addWorksheet('General');
  general.addRow(['Metric', 'Value']);
  general.addRow(['Finished matches', overview.general.gameCount]);
  general.addRow(['Humans only', overview.general.humanOnlyCount]);
  general.addRow(['With bots', overview.general.withBotsCount]);
  general.addRow(['Average duration ms', overview.general.avgDurationMs]);
  general.addRow(['Median duration ms', overview.general.medianDurationMs]);
  general.addRow(['Avg duration ms per human', overview.general.avgDurationMsPerHumanPlayer]);
  general.addRow(['Average turns', overview.general.avgTurnSequence]);
  general.addRow(['Average clock ms per turn', overview.general.avgClockMsPerTurn]);
  general.addRow(['Average occupancy', overview.general.avgOccupancy]);
  general.addRow([]);
  general.addRow(['Occupancy', 'Games', 'Avg duration ms', 'Avg turns']);
  for (const row of overview.general.durationByOccupancy) {
    general.addRow([row.occupancy, row.gameCount, row.avgDurationMs, row.avgTurnSequence]);
  }
  general.addRow([]);
  general.addRow(['Has bots', 'Games', 'Avg duration ms']);
  for (const row of overview.general.durationByOpponentMix) {
    general.addRow([row.hasBots, row.gameCount, row.avgDurationMs]);
  }

  const volume = workbook.addWorksheet('Volume');
  volume.addRow(['Day', 'Games']);
  for (const row of overview.volume.gamesByDay) {
    volume.addRow([row.day, row.gameCount]);
  }
  volume.addRow([]);
  volume.addRow(['Hour UTC', 'Games']);
  for (const row of overview.volume.gamesByHourUtc) {
    volume.addRow([row.hour, row.gameCount]);
  }

  const gameplay = workbook.addWorksheet('Gameplay');
  gameplay.addRow(['Action', 'Count']);
  for (const row of overview.gameplay.actions) {
    gameplay.addRow([row.action, row.count]);
  }
  gameplay.addRow([]);
  gameplay.addRow(['Kit', 'Picks', 'Wins', 'Pick rate', 'Win rate']);
  for (const row of overview.gameplay.kits) {
    gameplay.addRow([row.kitId, row.picks, row.wins, row.pickRate, row.winRate]);
  }
  gameplay.addRow([]);
  gameplay.addRow(['Special', 'Played']);
  for (const row of overview.gameplay.specialsPlayed) {
    gameplay.addRow([row.cardId, row.count]);
  }
  gameplay.addRow([]);
  gameplay.addRow(['Shared card', 'Played']);
  for (const row of overview.gameplay.sharedCardsPlayed) {
    gameplay.addRow([row.cardId, row.count]);
  }
  gameplay.addRow([]);
  gameplay.addRow(['Think seats', overview.gameplay.thinkTimeSeatCount]);
  gameplay.addRow(['Actor seats', overview.gameplay.actorSeatCount]);
  gameplay.addRow(['Avg think ms', overview.gameplay.avgThinkTimeMs]);
  gameplay.addRow(['Think per action ms', overview.gameplay.thinkTimePerActionMs]);
  gameplay.addRow(['p50 think ms', overview.gameplay.p50ThinkTimeMs]);
  gameplay.addRow(['p90 think ms', overview.gameplay.p90ThinkTimeMs]);
  gameplay.addRow(['Draw share', overview.gameplay.drawShare]);
  gameplay.addRow(['Think partial', overview.gameplay.thinkTimePartial]);
  gameplay.addRow(['Kit sample games', overview.gameplay.kitSampleGames]);

  const economy = workbook.addWorksheet('Economy');
  economy.addRow(['Shop action', 'Count']);
  for (const row of overview.economy.shopMix) {
    economy.addRow([row.action, row.count]);
  }
  economy.addRow([]);
  economy.addRow(['Upgrade card count', overview.economy.upgradeCardCount]);
  economy.addRow(['Upgraded plays', overview.economy.upgradedPlayCount]);
  economy.addRow(['Play or multi', overview.economy.playCardOrMultiCount]);
  economy.addRow(['Upgraded play share', overview.economy.upgradedPlayShare]);
  economy.addRow(['Avg leftover lives', overview.economy.avgLeftoverLives]);
  economy.addRow(['Avg leftover points', overview.economy.avgLeftoverPoints]);
  economy.addRow(['Avg leftover UP', overview.economy.avgLeftoverUpgradePoints]);
  economy.addRow(['Avg buys', overview.economy.avgBuyCount]);
  economy.addRow(['Avg sells', overview.economy.avgSellCount]);
  economy.addRow(['Avg upgrades', overview.economy.avgUpgradeCount]);
  economy.addRow(['Avg cards played', overview.economy.avgCardsPlayed]);

  const combat = workbook.addWorksheet('Combat');
  combat.addRow(['Lives lost (attack)', overview.combat.livesLost]);
  combat.addRow(['Shield absorbed', overview.combat.shieldAbsorbed]);
  combat.addRow(['Non-attack lives lost', overview.combat.nonAttackLivesLost]);
  combat.addRow([]);
  combat.addRow(['Outcome', 'Count']);
  for (const row of overview.combat.outcomes) {
    combat.addRow([row.outcome, row.count]);
  }

  const hidden = workbook.addWorksheet('Hidden');
  hidden.addRow(['Spy plays', overview.hidden.spyPlays]);
  hidden.addRow(['Thief plays', overview.hidden.thiefPlays]);
  hidden.addRow(['Unspy', overview.hidden.unspyCount]);
  hidden.addRow(['Mirror redirects', overview.hidden.mirrorRedirects]);
  hidden.addRow([]);
  hidden.addRow(['Persistent', 'Plays', 'Deactivations']);
  for (const row of overview.hidden.persistents) {
    hidden.addRow([row.cardId, row.plays, row.deactivations]);
  }

  const bots = workbook.addWorksheet('Bots and seats');
  bots.addRow(['Mixed games', overview.botsSeats.mixedGameCount]);
  bots.addRow(['Human wins in mixed', overview.botsSeats.humanWinsInMixed]);
  bots.addRow(['Human win rate in mixed', overview.botsSeats.humanWinRateInMixed]);
  bots.addRow([]);
  bots.addRow(['Difficulty', 'Games', 'Wins']);
  for (const row of overview.botsSeats.byBotDifficulty) {
    bots.addRow([row.difficulty, row.gameCount, row.wins]);
  }
  bots.addRow([]);
  bots.addRow(['Seat index', 'Wins', 'Games']);
  for (const row of overview.botsSeats.seatWinShare) {
    bots.addRow([row.seatIndex, row.wins, row.gameCount]);
  }

  const endings = workbook.addWorksheet('Endings');
  endings.addRow(['Reason', 'Count']);
  for (const row of overview.endings.reasons) {
    endings.addRow([row.reason, row.count]);
  }
  endings.addRow([]);
  endings.addRow(['Occupancy', 'Games', 'Leave games', 'Inactivity games']);
  for (const row of overview.endings.leaveRateByOccupancy) {
    endings.addRow([row.occupancy, row.gameCount, row.leaveGameCount, row.inactivityGameCount]);
  }
  endings.addRow([]);
  endings.addRow(['Avg winner lives', overview.endings.avgWinnerLives]);
  endings.addRow(['Lives bucket', 'Count']);
  for (const row of overview.endings.winnerLivesBuckets) {
    endings.addRow([row.bucket, row.count]);
  }
  endings.addRow([]);
  endings.addRow(['Duration bucket', 'Count']);
  for (const row of overview.endings.durationBuckets) {
    endings.addRow([row.bucket, row.count]);
  }

  const retention = workbook.addWorksheet('Retention');
  retention.addRow(['Rematch games', overview.retention.rematchGameCount]);
  retention.addRow(['Rematch rate', overview.retention.rematchRate]);
  retention.addRow(['Distinct nicknames', overview.retention.distinctNicknames]);
  retention.addRow(['Feedback reports', overview.feedbackPulse.reportCount]);
  retention.addRow(['Reports per game (date window)', overview.feedbackPulse.reportsPerGame]);
  retention.addRow([]);
  retention.addRow(['Kind', 'Count']);
  for (const row of overview.feedbackPulse.byKind) {
    retention.addRow([row.kind, row.count]);
  }

  await downloadWorkbook(workbook, filename);
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}
