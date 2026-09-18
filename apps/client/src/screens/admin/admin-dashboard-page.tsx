import type { AdminActorsFilter, AdminOverview } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import {
  DEFAULT_ADMIN_FILTERS,
  overviewQuery,
  type AdminFilterState,
} from '../../admin/filter-query';
import { adminErrorCopy, fetchAdminOverview } from '../../admin/fetch-admin';
import { exportOverviewXlsx } from '../../export/admin-xlsx';
import { Button } from '../../design/components/button';
import { AdminFiltersForm } from './admin-filters-form';
import { AdminOverviewModules } from './admin-overview-modules';
import { AdminPageIntro } from './admin-ui';

interface AdminDashboardPageProps {
  password: string;
}

export function AdminDashboardPage({ password }: AdminDashboardPageProps): ReactElement {
  const [filters, setFilters] = useState<AdminFilterState>(DEFAULT_ADMIN_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_ADMIN_FILTERS);
  const [actors, setActors] = useState<AdminActorsFilter>('both');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminOverview(password, overviewQuery(applied, actors)).then((result) => {
      if (cancelled) {
        return;
      }
      setHasLoaded(true);
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
  }, [password, applied, actors]);

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Overview"
        description="Nine modules on the finished-game log. Match mix filters games; Actors filters seats inside those games."
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
      {!hasLoaded && overview === null ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : null}
      {overview !== null ? (
        <>
          <div>
            <Button
              compact
              type="button"
              variant="orange"
              onClick={() => {
                void exportOverviewXlsx(overview);
              }}
            >
              Download Excel
            </Button>
          </div>
          <AdminOverviewModules
            overview={overview}
            actors={actors}
            onActorsChange={setActors}
          />
        </>
      ) : null}
    </div>
  );
}
