import type { AdminOverview } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import {
  DEFAULT_ADMIN_FILTERS,
  filtersToQuery,
  type AdminFilterState,
} from '../../admin/filter-query';
import { adminErrorCopy, fetchAdminOverview } from '../../admin/fetch-admin';
import { AdminFiltersForm } from './admin-filters-form';

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

  return (
    <div className="space-y-6">
      <AdminFiltersForm
        filters={filters}
        onChange={setFilters}
        onApply={() => {
          setApplied(filters);
        }}
      />
      {error !== null ? <p className="text-sm text-cta-red">{error}</p> : null}
      {overview !== null ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Games" value={String(overview.gameCount)} />
          <Stat label="Human-only" value={String(overview.humanOnlyCount)} />
          <Stat label="With bots" value={String(overview.withBotsCount)} />
          <Stat
            label="Avg duration"
            value={
              overview.avgDurationMs === null ? '—' : `${String(overview.avgDurationMs)} ms`
            }
          />
          <Stat
            label="Avg turns"
            value={overview.avgTurnSequence === null ? '—' : String(overview.avgTurnSequence)}
          />
          <Stat label="Feedback" value={String(overview.feedbackCount)} />
          <Stat
            label="Top kit (wins)"
            value={
              overview.topKitByWins === null
                ? '—'
                : `${overview.topKitByWins.kitId} (${String(overview.topKitByWins.wins)})`
            }
          />
        </dl>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-3">
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-ink">{value}</dd>
    </div>
  );
}
