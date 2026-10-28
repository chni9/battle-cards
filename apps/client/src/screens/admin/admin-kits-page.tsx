import type { AdminKitStatRow } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { formatCount, formatPercent, kitDisplayName } from '../../admin/admin-present';
import {
  DEFAULT_ADMIN_FILTERS,
  filtersToQuery,
  type AdminFilterState,
} from '../../admin/filter-query';
import { fetchAdminKitStats } from '../../admin/fetch-admin';
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
import { useAdminList } from './use-admin-list';

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
  // Counts Apply presses. It is part of the request key, so Apply always asks again, even with
  // unchanged filters: that is how a designer retries after an error (spec v7 §7.8).
  const [applyCount, setApplyCount] = useState(0);
  const list = useAdminList({
    key: JSON.stringify({ applied, applyCount }),
    load: () => fetchAdminKitStats(password, filtersToQuery(applied)),
  });
  const visibleStats = list.data;

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
          setApplyCount((count) => count + 1);
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
      {!list.loaded ? <AdminStatus state={{ kind: 'loading' }} /> : null}
      {list.error !== null ? <AdminStatus state={{ kind: 'error', message: list.error }} /> : null}
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
