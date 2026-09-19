import type { AdminTablePage } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import { columnDisplayName, formatCount, tableDisplayName } from '../../admin/admin-present';
import { adminErrorCopy, fetchAdminTable } from '../../admin/fetch-admin';
import { exportTablePageXlsx } from '../../export/admin-xlsx';
import { Button } from '../../design/components/button';
import { AdminPageIntro } from './admin-ui';

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
  const [loadedTable, setLoadedTable] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminTable(password, activeTable, { page: '1', pageSize: '50' }).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setError(adminErrorCopy(result.status));
        setPage(null);
        setLoadedTable(activeTable);
        return;
      }
      setPage(result.data);
      setLoadedTable(activeTable);
      setError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [password, activeTable]);

  const visiblePage = loadedTable === activeTable ? page : null;
  const columns = visiblePage?.columns ?? [];
  const rows = visiblePage?.rows ?? [];

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Database"
        description="Read-only view of log tables. Large fields are shortened in the grid."
      />
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
            {tableDisplayName(name)}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          compact
          type="button"
          variant="orange"
          disabled={visiblePage === null}
          onClick={() => {
            if (visiblePage !== null) {
              void exportTablePageXlsx(visiblePage);
            }
          }}
        >
          Download spreadsheet (this page)
        </Button>
        {visiblePage !== null ? (
          <p className="text-sm text-ink-muted">
            {formatCount(visiblePage.total)} rows · page {visiblePage.page}
          </p>
        ) : null}
      </div>
      {error !== null && loadedTable === activeTable ? (
        <p className="text-sm text-cta-red" role="alert">
          {error}
        </p>
      ) : null}
      <div className="overflow-hidden rounded-[length:var(--radius-card)] border border-border bg-surface-raised">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface">
                {columns.map((col) => (
                  <th
                    key={col.name}
                    className="whitespace-nowrap px-3 py-2.5 font-semibold uppercase tracking-wide text-ink-muted"
                  >
                    {columnDisplayName(col.name)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-border-soft align-top hover:bg-surface/80">
                  {columns.map((col) => (
                    <td key={col.name} className="max-w-[16rem] truncate px-3 py-2 text-ink">
                      {formatCell(row[col.name])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      return `Preview only (${String(record['totalBytes'])} bytes)`;
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}
