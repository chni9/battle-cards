import type { AdminGameListItem, AdminGamesPage } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

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
import { Button } from '../../design/components/button';
import { Dialog } from '../../design/components/dialog';
import { AdminFiltersForm } from './admin-filters-form';

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

export function AdminGamesPage({ password, detailId }: AdminGamesPageProps): ReactElement {
  const [filters, setFilters] = useState<AdminFilterState>(DEFAULT_ADMIN_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_ADMIN_FILTERS);
  const [page, setPage] = useState<AdminGamesPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [pickedDetail, setPickedDetail] = useState<string | null>(null);
  const [ignoreUrlDetail, setIgnoreUrlDetail] = useState(false);
  const activeDetail = pickedDetail ?? (ignoreUrlDetail ? null : detailId);
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof fetchAdminGameDetail>
  > | null>(null);

  useEffect(() => {
    void fetchAdminGames(password, { ...filtersToQuery(applied), page: '1' }).then((result) => {
      if (!result.ok) {
        setError(adminErrorCopy(result.status));
        return;
      }
      setPage(result.data);
      setError(null);
    });
  }, [password, applied]);

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

  const items = page?.items ?? [];

  return (
    <div className="space-y-6">
      <AdminFiltersForm
        filters={filters}
        onChange={setFilters}
        onApply={() => {
          setApplied(filters);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          compact
          type="button"
          variant="orange"
          disabled={items.length === 0}
          onClick={() => {
            void exportGamesListXlsx(items);
          }}
        >
          Excel (list)
        </Button>
      </div>
      {error !== null ? <p className="text-sm text-cta-red">{error}</p> : null}
      {detailError !== null ? <p className="text-sm text-cta-red">{detailError}</p> : null}
      <ul className="divide-y divide-border-soft rounded-[length:var(--radius-card)] border border-border bg-surface-raised">
        {items.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className="block w-full px-3 py-3 text-left"
              onClick={() => {
                openDetail(row.id);
              }}
            >
              <GameRow row={row} />
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        open={activeDetail !== null && detail?.ok === true}
        title={detail?.ok === true ? detail.data.roomId : 'Game'}
        panelClassName="max-w-lg"
        onClose={closeDetail}
        actions={
          <>
            {detail?.ok === true && detail.data.exportLog !== undefined ? (
              <Button
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
                Excel (match)
              </Button>
            ) : null}
            <Button compact type="button" variant="orange" onClick={closeDetail}>
              Close
            </Button>
          </>
        }
      >
        {detail?.ok === true ? (
          <div className="space-y-2 text-sm">
            <p>Seed: {detail.data.seed}</p>
            <p>
              Winner: {detail.data.winnerNickname ?? detail.data.winnerPlayerId} ·{' '}
              {detail.data.turnSequence} turns · {detail.data.durationMs} ms
            </p>
            <ul className="space-y-1">
              {detail.data.seats.map((seat) => (
                <li key={seat.playerId}>
                  {seat.nickname ?? seat.playerId} — {seat.kitId} — {seat.lives} lives
                  {seat.isWinner ? ' · winner' : ''}
                  {seat.isBot ? ' · bot' : ''}
                </li>
              ))}
            </ul>
            {detail.data.eliminations.length > 0 ? (
              <div>
                <p className="font-medium">Eliminations</p>
                <ol className="list-decimal pl-5">
                  {detail.data.eliminations.map((elim) => (
                    <li key={elim.orderIndex}>
                      {elim.nickname ?? elim.playerId} ({elim.reason})
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function GameRow({ row }: { row: AdminGameListItem }): ReactElement {
  return (
    <>
      <p className="text-xs text-ink-muted">
        {row.roomId} · {row.endedAt} · {row.occupancy} seats
        {row.hasBots ? ' · bots' : ''}
        {row.isTutorial ? ' · tutorial' : ''}
      </p>
      <p className="mt-1 text-sm text-ink">
        {row.winnerNickname ?? '—'} · {row.winnerKitId ?? '—'} · {row.turnSequence} turns
      </p>
    </>
  );
}
