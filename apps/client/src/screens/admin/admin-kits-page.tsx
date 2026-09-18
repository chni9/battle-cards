import type { AdminKitStatRow, AdminKitStats } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import { formatCount, formatPercent, kitDisplayName } from '../../admin/admin-present';
import {
  DEFAULT_ADMIN_FILTERS,
  filtersToQuery,
  type AdminFilterState,
} from '../../admin/filter-query';
import { adminErrorCopy, fetchAdminKitStats } from '../../admin/fetch-admin';
import { exportKitStatsXlsx } from '../../export/admin-xlsx';
import { Button } from '../../design/components/button';
import { AdminFiltersForm } from './admin-filters-form';
import { AdminDataTable, AdminPageIntro, type AdminTableColumn } from './admin-ui';

interface AdminKitsPageProps {
  password: string;
}

const kitColumns: AdminTableColumn<AdminKitStatRow>[] = [
  {
    id: 'kit',
    header: 'Kit',
    cell: (row) => <span className="font-medium">{kitDisplayName(row.kitId)}</span>,
  },
  {
    id: 'picks',
    header: 'Times picked',
    align: 'right',
    cell: (row) => formatCount(row.picks),
  },
  {
    id: 'wins',
    header: 'Wins',
    align: 'right',
    cell: (row) => formatCount(row.wins),
  },
  {
    id: 'pickRate',
    header: 'Share of picks',
    align: 'right',
    cell: (row) => formatPercent(row.pickRate),
  },
  {
    id: 'winRate',
    header: 'Win rate',
    align: 'right',
    cell: (row) => formatPercent(row.winRate),
  },
];

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
    <div className="space-y-8">
      <AdminPageIntro
        title="Kits"
        description="Pick and win rates for the filtered match set. Tutorial matches stay excluded unless you change filters."
      />
      <AdminFiltersForm
        filters={filters}
        onChange={setFilters}
        onApply={() => {
          setApplied(filters);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
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
          Download spreadsheet
        </Button>
        {stats !== null ? (
          <p className="text-sm text-ink-muted">
            Based on {formatCount(stats.sampleGames)} matches
          </p>
        ) : null}
      </div>
      {error !== null ? (
        <p className="text-sm text-cta-red" role="alert">
          {error}
        </p>
      ) : null}
      <AdminDataTable
        columns={kitColumns}
        rows={stats?.rows ?? []}
        rowKey={(row) => row.kitId}
        emptyMessage="No kit data for these filters."
      />
    </div>
  );
}
