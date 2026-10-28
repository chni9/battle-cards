import type { AdminActorsFilter } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import {
  DEFAULT_ADMIN_FILTERS,
  overviewQuery,
  type AdminFilterState,
} from '../../admin/filter-query';
import { fetchAdminOverview } from '../../admin/fetch-admin';
import { exportOverviewXlsx } from '../../export/admin-xlsx';
import { Button } from '../../ui/primitives/button';
import { AdminFiltersForm } from './admin-filters-form';
import { AdminOverviewModules } from './admin-overview-modules';
import { AdminPageIntro, AdminStatus } from './admin-ui';
import { useAdminList } from './use-admin-list';

interface AdminDashboardPageProps {
  password: string;
}

/**
 * Every overview answer belongs to one result set, so `lastData` is the last overview loaded
 * whatever the filters: a refetch or a failure never blanks the modules (L80-05).
 */
const OVERVIEW_SCOPE = 'overview';

/**
 * Overview (spec v7 §7.8, L80-05). While a request is in flight the `AdminStatus` Loading… line
 * shows, above the last loaded modules when there are some; a failure is the alert above them,
 * gone as soon as the next request starts.
 */
export function AdminDashboardPage({ password }: AdminDashboardPageProps): ReactElement {
  const [filters, setFilters] = useState<AdminFilterState>(DEFAULT_ADMIN_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_ADMIN_FILTERS);
  const [actors, setActors] = useState<AdminActorsFilter>('both');
  const read = useAdminList({
    key: JSON.stringify({ applied, actors }),
    scope: OVERVIEW_SCOPE,
    load: () => fetchAdminOverview(password, overviewQuery(applied, actors)),
  });
  const overview = read.lastData;

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
      {read.error !== null ? <AdminStatus state={{ kind: 'error', message: read.error }} /> : null}
      {!read.loaded ? <AdminStatus state={{ kind: 'loading' }} /> : null}
      {overview !== null ? (
        <>
          <div>
            <Button
              type="button"
              variant="quiet"
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
