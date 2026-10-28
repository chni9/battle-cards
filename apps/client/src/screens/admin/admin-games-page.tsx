import type { AdminGameListItem, AdminGamesPage } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import { adminPageCount } from '../../admin/admin-paging';
import {
  formatCount,
  formatDateTime,
  formatMinutesFromMs,
  formatTurns,
  kitDisplayName,
  eliminationReasonLabel,
} from '../../admin/admin-present';
import {
  DEFAULT_ADMIN_FILTERS,
  filtersToQuery,
  type AdminFilterState,
} from '../../admin/filter-query';
import { adminErrorCopy, fetchAdminGameDetail, fetchAdminGames } from '../../admin/fetch-admin';
import { exportGamesListXlsx } from '../../export/admin-xlsx';
import {
  buildActionLogWorkbook,
  downloadWorkbookBuffer,
} from '../../export/build-action-log-xlsx';
// The detail Dialog is still the V2 one (its action buttons are the V2 `Button`); L80-07 replaces
// both with the V7 Dialog and drops these two imports.
import { Button as DialogButton } from '../../design/components/button';
import { Dialog } from '../../design/components/dialog';
import { Button } from '../../ui/primitives/button';
import { ADMIN_BODY_TEXT_CLASS } from './admin-classes';
import { AdminFiltersForm } from './admin-filters-form';
import {
  AdminDataTable,
  AdminPageIntro,
  AdminPager,
  AdminStatus,
  type AdminTableColumn,
} from './admin-ui';

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
    cell: (row) => {
      const notes: string[] = [];
      if (row.hasBots) {
        notes.push('Bots');
      }
      if (row.isTutorial) {
        notes.push('Tutorial');
      }
      return notes.length === 0 ? '—' : notes.join(' · ');
    },
  },
];

export function AdminGamesPage({ password, detailId }: AdminGamesPageProps): ReactElement {
  const [filters, setFilters] = useState<AdminFilterState>(DEFAULT_ADMIN_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_ADMIN_FILTERS);
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState<AdminGamesPage | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [pickedDetail, setPickedDetail] = useState<string | null>(null);
  const [ignoreUrlDetail, setIgnoreUrlDetail] = useState(false);
  const activeDetail = pickedDetail ?? (ignoreUrlDetail ? null : detailId);
  const listKey = JSON.stringify({ applied, page: pageNumber });
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof fetchAdminGameDetail>
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    // No `pageSize`: the server default (50) applies and there is no size picker (L80-06).
    void fetchAdminGames(password, {
      ...filtersToQuery(applied),
      page: String(pageNumber),
    }).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setError(adminErrorCopy(result.status));
        setPage(null);
        setLoadedKey(listKey);
        return;
      }
      setPage(result.data);
      setLoadedKey(listKey);
      setError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [password, applied, pageNumber, listKey]);

  useEffect(() => {
    if (activeDetail === null) {
      return;
    }
    let cancelled = false;
    void fetchAdminGameDetail(password, activeDetail).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setDetailError(adminErrorCopy(result.status));
        setDetail(null);
        return;
      }
      setDetail(result);
      setDetailError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [password, activeDetail]);

  const closeDetail = (): void => {
    setPickedDetail(null);
    setIgnoreUrlDetail(true);
    setDetail(null);
    setDetailError(null);
    if (window.location.pathname.startsWith('/admin/games/')) {
      window.history.replaceState({}, '', gamesListPath());
    }
  };

  const openDetail = (gameId: string): void => {
    setIgnoreUrlDetail(false);
    setPickedDetail(gameId);
    setDetail(null);
    setDetailError(null);
    window.history.replaceState({}, '', gameDetailPath(gameId));
  };

  const loaded = loadedKey === listKey;
  const visiblePage = loaded ? page : null;
  const items = visiblePage?.items ?? [];

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
      {!loaded ? <AdminStatus state={{ kind: 'loading' }} /> : null}
      {loaded && error !== null ? <AdminStatus state={{ kind: 'error', message: error }} /> : null}
      {detailError !== null ? (
        <p className="text-sm text-cta-red" role="alert">
          {detailError}
        </p>
      ) : null}

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
      {/* Until the page for this key loads there is no total, so the count is the page itself:
          "Page 1 of 1" at first, never "Page 2 of 1". */}
      <AdminPager
        page={pageNumber}
        pageCount={visiblePage === null ? pageNumber : adminPageCount(visiblePage.total, visiblePage.pageSize)}
        onPage={setPageNumber}
        disabled={visiblePage === null}
      />

      <Dialog
        open={activeDetail !== null && detail?.ok === true}
        title={detail?.ok === true ? `Match ${detail.data.roomId}` : 'Match'}
        panelClassName="max-w-2xl"
        onClose={closeDetail}
        actions={
          <>
            {detail?.ok === true && detail.data.exportLog !== undefined ? (
              <DialogButton
                compact
                type="button"
                variant="orange"
                onClick={() => {
                  const exportLog = detail.data.exportLog;
                  if (exportLog === undefined) {
                    return;
                  }
                  void buildActionLogWorkbook(exportLog).then((buffer) => {
                    downloadWorkbookBuffer(buffer, `${detail.data.roomId}.xlsx`);
                  });
                }}
              >
                Download action log
              </DialogButton>
            ) : null}
            <DialogButton compact type="button" variant="orange" onClick={closeDetail}>
              Close
            </DialogButton>
          </>
        }
      >
        {detail?.ok === true ? (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <dt className="text-ink-muted">Ended</dt>
                <dd className="font-medium">{formatDateTime(detail.data.endedAt)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Length</dt>
                <dd className="font-medium">{formatMinutesFromMs(detail.data.durationMs)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Turns</dt>
                <dd className="font-medium">{formatTurns(detail.data.turnSequence)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Winner</dt>
                <dd className="font-medium">
                  {detail.data.winnerNickname ?? 'Unknown'}
                </dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Seats
              </p>
              <AdminDataTable
                label="Seats"
                columns={[
                  { id: 'nick', header: 'Player', cell: (s) => s.nickname ?? '—' },
                  { id: 'kit', header: 'Kit', cell: (s) => kitDisplayName(s.kitId) },
                  {
                    id: 'lives',
                    header: 'Lives',
                    align: 'right',
                    cell: (s) => s.lives,
                  },
                  {
                    id: 'role',
                    header: 'Role',
                    cell: (s) => {
                      if (s.isWinner) {
                        return 'Winner';
                      }
                      if (s.isBot) {
                        return 'Bot';
                      }
                      if (s.isEliminated) {
                        return 'Eliminated';
                      }
                      return 'Player';
                    },
                  },
                ]}
                rows={detail.data.seats}
                rowKey={(s) => s.playerId}
              />
            </div>
            {detail.data.eliminations.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Elimination order
                </p>
                <ol className="list-decimal space-y-1 pl-5 text-ink">
                  {detail.data.eliminations.map((elim) => (
                    <li key={elim.orderIndex}>
                      {elim.nickname ?? 'Unknown'} — {eliminationReasonLabel(elim.reason)}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <p className="text-xs text-ink-muted">
              Replay seed (designer only):{' '}
              <span className="font-mono text-ink">{detail.data.seed}</span>
            </p>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
