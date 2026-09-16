/**
 * Allowlisted Postgres table browser for admin (Lot 61).
 */

import type { AdminTableColumn, AdminTablePage } from '@card-battle/shared';
import type { Pool } from 'pg';

const ALLOWED_TABLES = new Set([
  'finished_games',
  'finished_game_players',
  'finished_game_eliminations',
  'feedback_reports',
]);

const JSONB_COLUMNS = new Set([
  'action_log',
  'export_log',
  'hand',
  'special_cards',
  'cards_played_by_id',
  'log_tail',
]);

/** Grid preview cap — full values stay in Postgres (L61-05). */
const TRUNCATE_BYTES = 512;

export function isAllowedAdminTable(name: string): boolean {
  return ALLOWED_TABLES.has(name);
}

function truncateJsonbValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  const raw = JSON.stringify(value);
  if (raw.length <= TRUNCATE_BYTES) {
    return value;
  }
  return {
    _truncated: true,
    previewBytes: TRUNCATE_BYTES,
    totalBytes: raw.length,
    preview: raw.slice(0, TRUNCATE_BYTES),
  };
}

function mapRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (JSONB_COLUMNS.has(key) || (table === 'feedback_reports' && key === 'topics')) {
      out[key] = truncateJsonbValue(value);
    } else if (value instanceof Date) {
      out[key] = value.toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function loadAdminTablePage(
  pool: Pool,
  table: string,
  page: number,
  pageSize: number,
  offset: number,
): Promise<AdminTablePage | null> {
  if (!isAllowedAdminTable(table)) {
    return null;
  }

  const columnsResult = await pool.query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position ASC`,
    [table],
  );

  const columns: AdminTableColumn[] = columnsResult.rows.map((row) => ({
    name: row.column_name,
    dataType: row.data_type,
  }));

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${quoteTable(table)}`,
  );
  const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10);

  const orderBy = tableOrderBy(table, columns);

  const rowsResult = await pool.query<Record<string, unknown>>(
    `SELECT * FROM ${quoteTable(table)} ORDER BY ${orderBy} LIMIT $1 OFFSET $2`,
    [pageSize, offset],
  );

  return {
    table,
    columns,
    rows: rowsResult.rows.map((row) => mapRow(table, row)),
    page,
    pageSize,
    total,
  };
}

function tableOrderBy(table: string, columns: readonly AdminTableColumn[]): string {
  if (columns.some((col) => col.name === 'created_at')) {
    return 'created_at DESC';
  }
  if (table === 'finished_games') {
    return 'ended_at DESC';
  }
  if (table === 'finished_game_players') {
    return 'game_id DESC, seat_index ASC';
  }
  if (table === 'finished_game_eliminations') {
    return 'game_id DESC, order_index ASC';
  }
  return '1';
}

function quoteTable(table: string): string {
  if (!isAllowedAdminTable(table)) {
    throw new Error('invalid table');
  }
  return `"${table}"`;
}
