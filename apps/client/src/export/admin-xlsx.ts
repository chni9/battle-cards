/**
 * Client-side Excel exports for admin views (Lot 61).
 */

import type { AdminGameListItem, AdminKitStatRow, AdminTablePage } from '@card-battle/shared';
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
