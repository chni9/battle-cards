import type { AdminGameDetail, AdminGameListItem } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import { adminPagerCount } from '../../admin/admin-paging';
import {
  formatCount,
  formatDateTime,
  formatMinutesFromMs,
  formatTurns,
  gameNotesLabel,
  kitDisplayName,
} from '../../admin/admin-present';
import {
  DEFAULT_ADMIN_FILTERS,
  filtersToQuery,
  type AdminFilterState,
} from '../../admin/filter-query';
import {
  adminErrorCopy,
  fetchAdminGameDetail,
  fetchAdminGames,
  type AdminFetchResult,
} from '../../admin/fetch-admin';
import { exportGamesListXlsx } from '../../export/admin-xlsx';
import { Button } from '../../ui/primitives/button';
import { ADMIN_BODY_TEXT_CLASS } from './admin-classes';
import { AdminGameDetailDialog } from './admin-game-detail-dialog';
import { AdminFiltersForm } from './admin-filters-form';
import {
  AdminDataTable,
  AdminPageIntro,
  AdminPager,
  AdminStatus,
  type AdminTableColumn,
} from './admin-ui';
import { useAdminList } from './use-admin-list';

interface AdminGamesPageProps {
  password: string;
  detailId: string | null;
}

function gamesListPath(): string {
  return '/admin/games';
}

function gameDetailPath(gameId: string): string {
  return `/admin/games/${encodeURIComponent(gameId)}`;
}

/**
 * Room code leads so the row's open button is the first Tab stop of each row (L80-06). The
 * columns are otherwise those of Lot 62.
 */
const gameColumns: AdminTableColumn<AdminGameListItem>[] = [
  {
    id: 'code',
    header: 'Room code',
    cell: (row) => row.roomId,
  },
  {
    id: 'ended',
    header: 'Ended',
    cell: (row) => formatDateTime(row.endedAt),
  },
  {
    id: 'seats',
    header: 'Players',
    align: 'right',
    cell: (row) => row.occupancy,
  },
  {
    id: 'winner',
    header: 'Winner',
    cell: (row) => row.winnerNickname ?? '—',
  },
  {
    id: 'kit',
    header: 'Winning kit',
    cell: (row) => kitDisplayName(row.winnerKitId),
  },
  {
    id: 'length',
    header: 'Length',
    align: 'right',
    cell: (row) => formatMinutesFromMs(row.durationMs),
  },
  {
    id: 'turns',
    header: 'Turns',
    align: 'right',
    cell: (row) => formatTurns(row.turnSequence),
  },
  {
    id: 'flags',
    header: 'Notes',
    cell: gameNotesLabel,
  },
];

export function AdminGamesPage({ password, detailId }: AdminGamesPageProps): ReactElement {
  const [filters, setFilters] = useState<AdminFilterState>(DEFAULT_ADMIN_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_ADMIN_FILTERS);
  const [pageNumber, setPageNumber] = useState(1);
  // The pager count belongs to the applied filters: paging keeps it, new filters forget it.
  const list = useAdminList({
    key: JSON.stringify({ applied, page: pageNumber }),
    scope: JSON.stringify(applied),
    // No `pageSize`: the server default (50) applies and there is no size picker (L80-06).
    load: () => fetchAdminGames(password, { ...filtersToQuery(applied), page: String(pageNumber) }),
  });
  // The answer to the detail request, tagged with the match it is for. Everything the page shows
  // (Loading…, the alert, the dialog) is derived from it and `activeDetail`, so an answer for a
  // match that is no longer the active one can never show (L80-07).
  const [detailAnswer, setDetailAnswer] = useState<{
    id: string;
    result: AdminFetchResult<AdminGameDetail>;
  } | null>(null);
  // Counts openings. Opening the active match again (a retry after a 404 or 503) leaves
  // `activeDetail` as it was, so this is what makes the effect ask again.
  const [detailOpenings, setDetailOpenings] = useState(0);
  const [pickedDetail, setPickedDetail] = useState<string | null>(null);
  const [ignoreUrlDetail, setIgnoreUrlDetail] = useState(false);
  const activeDetail = pickedDetail ?? (ignoreUrlDetail ? null : detailId);

  useEffect(() => {
    if (activeDetail === null) {
      return;
    }
    let cancelled = false;
    void fetchAdminGameDetail(password, activeDetail).then((result) => {
      if (cancelled) {
        return;
      }
      setDetailAnswer({ id: activeDetail, result });
    });
    return () => {
      cancelled = true;
    };
  }, [password, activeDetail, detailOpenings]);

  const closeDetail = (): void => {
    setPickedDetail(null);
    setIgnoreUrlDetail(true);
    setDetailAnswer(null);
    if (window.location.pathname.startsWith('/admin/games/')) {
      window.history.replaceState({}, '', gamesListPath());
    }
  };

  const openDetail = (gameId: string): void => {
    setIgnoreUrlDetail(false);
    setPickedDetail(gameId);
    setDetailAnswer(null);
    setDetailOpenings((count) => count + 1);
    window.history.replaceState({}, '', gameDetailPath(gameId));
  };

  const answer = detailAnswer?.id === activeDetail ? detailAnswer.result : null;
  const detail = answer?.ok === true ? answer.data : null;
  const detailError = answer !== null && !answer.ok ? adminErrorCopy(answer.status) : null;
  const detailLoading = activeDetail !== null && answer === null;

  const visiblePage = list.data;
  const items = visiblePage?.items ?? [];
  // While a page loads the label keeps the last total known for these filters; new filters read
  // "Page 1 of 1" until their first page loads (another result set, another total).
  const pagerCount = adminPagerCount(pageNumber, visiblePage, list.lastData);

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Matches"
        description="Finished games from the log. Select a row for seats, eliminations, and export."
      />
      <AdminFiltersForm
        filters={filters}
        onChange={setFilters}
        onApply={() => {
          setApplied(filters);
          setPageNumber(1);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="quiet"
          disabled={items.length === 0}
          onClick={() => {
            void exportGamesListXlsx(items);
          }}
        >
          Download spreadsheet (this page)
        </Button>
        {visiblePage !== null ? (
          <p className={`${ADMIN_BODY_TEXT_CLASS} text-v7-text-2`}>
            Showing {formatCount(items.length)} of {formatCount(visiblePage.total)}
          </p>
        ) : null}
      </div>
      {!list.loaded ? <AdminStatus state={{ kind: 'loading' }} /> : null}
      {list.error !== null ? <AdminStatus state={{ kind: 'error', message: list.error }} /> : null}
      {detailLoading ? <AdminStatus state={{ kind: 'loading' }} /> : null}
      {detailError !== null ? <AdminStatus state={{ kind: 'error', message: detailError }} /> : null}

      {visiblePage !== null ? (
        <AdminDataTable
          label="Matches"
          columns={gameColumns}
          rows={items}
          rowKey={(row) => row.id}
          emptyMessage="No finished matches match these filters."
          onRowOpen={(row) => {
            openDetail(row.id);
          }}
          rowOpenLabel={(row) => `Open match ${row.roomId}`}
        />
      ) : null}
      <AdminPager
        page={pageNumber}
        pageCount={pagerCount}
        onPage={setPageNumber}
        disabled={visiblePage === null}
      />

      <AdminGameDetailDialog detail={detail} onClose={closeDetail} />
    </div>
  );
}
