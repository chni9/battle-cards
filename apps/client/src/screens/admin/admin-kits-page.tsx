import type { AdminKitStats } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import {
  DEFAULT_ADMIN_FILTERS,
  filtersToQuery,
  type AdminFilterState,
} from '../../admin/filter-query';
import { adminErrorCopy, fetchAdminKitStats } from '../../admin/fetch-admin';
import { exportKitStatsXlsx } from '../../export/admin-xlsx';
import { Button } from '../../design/components/button';
import { AdminFiltersForm } from './admin-filters-form';

interface AdminKitsPageProps {
  password: string;
}

export function AdminKitsPage({ password }: AdminKitsPageProps): ReactElement {
  const [filters, setFilters] = useState<AdminFilterState>(DEFAULT_ADMIN_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_ADMIN_FILTERS);
  const [stats, setStats] = useState<AdminKitStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAdminKitStats(password, filtersToQuery(applied)).then((result) => {
      if (!result.ok) {
        setError(adminErrorCopy(result.status));
        return;
      }
      setStats(result.data);
      setError(null);
    });
  }, [password, applied]);

  return (
    <div className="space-y-6">
      <AdminFiltersForm
        filters={filters}
        onChange={setFilters}
        onApply={() => {
          setApplied(filters);
        }}
      />
      <Button
        compact
        type="button"
        variant="orange"
        disabled={stats === null || stats.rows.length === 0}
        onClick={() => {
          if (stats !== null) {
            void exportKitStatsXlsx(stats.rows);
          }
        }}
      >
        Excel
      </Button>
      {error !== null ? <p className="text-sm text-cta-red">{error}</p> : null}
      {stats !== null ? (
        <p className="text-sm text-ink-muted">Sample games: {stats.sampleGames}</p>
      ) : null}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-ink-muted">
            <th className="py-2 pr-2">Kit</th>
            <th className="py-2 pr-2">Picks</th>
            <th className="py-2 pr-2">Wins</th>
            <th className="py-2 pr-2">Pick %</th>
            <th className="py-2">Win %</th>
          </tr>
        </thead>
        <tbody>
          {stats?.rows.map((row) => (
            <tr key={row.kitId} className="border-b border-border-soft">
              <td className="py-2 pr-2">{row.kitId}</td>
              <td className="py-2 pr-2">{row.picks}</td>
              <td className="py-2 pr-2">{row.wins}</td>
              <td className="py-2 pr-2">{(row.pickRate * 100).toFixed(1)}</td>
              <td className="py-2">{(row.winRate * 100).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
