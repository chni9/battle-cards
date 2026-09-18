import type { AdminOverview } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import { kitDisplayName, formatCount, formatMinutesFromMs, formatTurns } from '../../admin/admin-present';
import {
  DEFAULT_ADMIN_FILTERS,
  filtersToQuery,
  type AdminFilterState,
} from '../../admin/filter-query';
import { adminErrorCopy, fetchAdminOverview } from '../../admin/fetch-admin';
import { AdminFiltersForm } from './admin-filters-form';
import { AdminMetricCard, AdminMetricGrid, AdminPageIntro } from './admin-ui';

interface AdminDashboardPageProps {
  password: string;
}

export function AdminDashboardPage({ password }: AdminDashboardPageProps): ReactElement {
  const [filters, setFilters] = useState<AdminFilterState>(DEFAULT_ADMIN_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_ADMIN_FILTERS);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminOverview(password, filtersToQuery(applied)).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setError(adminErrorCopy(result.status));
        return;
      }
      setOverview(result.data);
      setError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [password, applied]);

  const topKit =
    overview?.topKitByWins === null || overview?.topKitByWins === undefined
      ? '—'
      : `${kitDisplayName(overview.topKitByWins.kitId)} (${formatCount(overview.topKitByWins.wins)} wins)`;

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Overview"
        description="Summary for finished matches in the log. Lengths are shown in minutes."
      />
      <AdminFiltersForm
        filters={filters}
        onChange={setFilters}
        onApply={() => {
          setApplied(filters);
        }}
      />
      {error !== null ? (
        <p className="text-sm text-cta-red" role="alert">
          {error}
        </p>
      ) : null}
      {overview !== null ? (
        <AdminMetricGrid>
          <AdminMetricCard label="Finished matches" value={formatCount(overview.gameCount)} />
          <AdminMetricCard
            label="Humans only"
            value={formatCount(overview.humanOnlyCount)}
            hint="No bot seats"
          />
          <AdminMetricCard
            label="With bots"
            value={formatCount(overview.withBotsCount)}
            hint="At least one bot seat"
          />
          <AdminMetricCard
            label="Average length"
            value={formatMinutesFromMs(overview.avgDurationMs)}
            hint="Per match"
          />
          <AdminMetricCard
            label="Average length per human"
            value={formatMinutesFromMs(overview.avgDurationMsPerHumanPlayer)}
            hint="Weighted by human seats; bots excluded"
          />
          <AdminMetricCard
            label="Average turns"
            value={
              overview.avgTurnSequence === null ? '—' : formatTurns(overview.avgTurnSequence)
            }
          />
          <AdminMetricCard label="Feedback reports" value={formatCount(overview.feedbackCount)} />
          <AdminMetricCard label="Most wins (kit)" value={topKit} />
        </AdminMetricGrid>
      ) : null}
    </div>
  );
}
