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
import { Button } from '../../ui/primitives/button';
import { ADMIN_BODY_TEXT_CLASS } from './admin-classes';
import { AdminFiltersForm } from './admin-filters-form';
import {
  AdminDataTable,
  AdminPageIntro,
  AdminStatus,
  type AdminTableColumn,
} from './admin-ui';

interface AdminKitsPageProps {
  password: string;
}

const kitColumns: AdminTableColumn<AdminKitStatRow>[] = [
  {
    id: 'kit',
    header: 'Kit',
    cell: (row) => <span className="font-extrabold">{kitDisplayName(row.kitId)}</span>,
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
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const listKey = JSON.stringify(applied);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminKitStats(password, filtersToQuery(applied)).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setError(adminErrorCopy(result.status));
        setStats(null);
        setLoadedKey(listKey);
        return;
      }
      setStats(result.data);
      setLoadedKey(listKey);
      setError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [password, applied, listKey]);

  const loaded = loadedKey === listKey;
  const visibleStats = loaded ? stats : null;

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
          variant="quiet"
          disabled={visibleStats === null || visibleStats.rows.length === 0}
          onClick={() => {
            if (visibleStats !== null) {
              void exportKitStatsXlsx(visibleStats.rows);
            }
          }}
        >
          Download spreadsheet
        </Button>
        {visibleStats !== null ? (
          <p className={`${ADMIN_BODY_TEXT_CLASS} text-v7-text-2`}>
            Based on {formatCount(visibleStats.sampleGames)} matches
          </p>
        ) : null}
      </div>
      {!loaded ? <AdminStatus state={{ kind: 'loading' }} /> : null}
      {loaded && error !== null ? <AdminStatus state={{ kind: 'error', message: error }} /> : null}
      {visibleStats !== null ? (
        <AdminDataTable
          label="Kit stats"
          columns={kitColumns}
          rows={visibleStats.rows}
          rowKey={(row) => row.kitId}
          emptyMessage="No kit data for these filters."
        />
      ) : null}
    </div>
  );
}
