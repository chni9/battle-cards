import type { AdminTablePage } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import { adminErrorCopy, fetchAdminTable } from '../../admin/fetch-admin';
import { exportTablePageXlsx } from '../../export/admin-xlsx';
import { Button } from '../../design/components/button';

const TABLES = [
  'finished_games',
  'finished_game_players',
  'finished_game_eliminations',
  'feedback_reports',
] as const;

interface AdminDataPageProps {
  password: string;
  table: string | null;
}

export function AdminDataPage({ password, table }: AdminDataPageProps): ReactElement {
  const [pickedTable, setPickedTable] = useState<string | null>(null);
  const activeTable = table ?? pickedTable ?? 'finished_games';
  const [page, setPage] = useState<AdminTablePage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAdminTable(password, activeTable, { page: '1', pageSize: '50' }).then((result) => {
      if (!result.ok) {
        setError(adminErrorCopy(result.status));
        return;
      }
      setPage(result.data);
      setError(null);
    });
  }, [password, activeTable]);

  const columns = page?.columns ?? [];
  const rows = page?.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABLES.map((name) => (
          <Button
            key={name}
            compact
            type="button"
            variant={activeTable === name ? 'green' : 'orange'}
            onClick={() => {
              setPickedTable(name);
              window.history.pushState({}, '', `/admin/data/${name}`);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          >
            {name}
          </Button>
        ))}
      </div>
      <Button
        compact
        type="button"
        variant="orange"
        disabled={page === null}
        onClick={() => {
          if (page !== null) {
            void exportTablePageXlsx(page);
          }
        }}
      >
        Excel (page)
      </Button>
      {error !== null ? <p className="text-sm text-cta-red">{error}</p> : null}
      {page !== null ? (
        <p className="text-xs text-ink-muted">
          {page.total} rows · page {page.page}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th key={col.name} className="px-2 py-1 font-medium text-ink-muted">
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-border-soft align-top">
                {columns.map((col) => (
                  <td key={col.name} className="max-w-[14rem] truncate px-2 py-1">
                    {formatCell(row[col.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record['_truncated'] === true) {
      return `[truncated ${String(record['totalBytes'])} B]`;
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}
