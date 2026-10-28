import type { AdminTablePage } from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import { adminPageCount } from '../../admin/admin-paging';
import { columnDisplayName, formatCount, tableDisplayName } from '../../admin/admin-present';
import type { AdminLink } from '../../admin/admin-routes';
import { adminErrorCopy, fetchAdminTable } from '../../admin/fetch-admin';
import { exportTablePageXlsx } from '../../export/admin-xlsx';
import { Button } from '../../ui/primitives/button';
import { ADMIN_BODY_TEXT_CLASS } from './admin-classes';
import {
  AdminDataTable,
  AdminLinkBar,
  AdminPageIntro,
  AdminPager,
  AdminStatus,
  type AdminTableColumn,
} from './admin-ui';

/**
 * The tabs, in order (spec v7 §7.8, L80-11). `game_chat_messages` (Lot 70) is last: the server has
 * allowlisted it since Lot 70 and L80-11 only gives it a tab. The rows keep the server's order,
 * with no per-game filter.
 */
const TABLES = [
  'finished_games',
  'finished_game_players',
  'finished_game_eliminations',
  'feedback_reports',
  'game_chat_messages',
] as const;

const DEFAULT_TABLE = 'finished_games';

/** Rows per request. There is no size picker, so the pager math and the request agree (L80-10). */
const PAGE_SIZE = 50;

const TABLE_LINKS: readonly AdminLink[] = TABLES.map((name) => ({
  href: `/admin/data/${name}`,
  label: tableDisplayName(name),
}));

interface AdminDataPageProps {
  password: string;
  table: string | null;
}

/**
 * One body row of the browser grid. The server rows carry no id the grid can rely on (a players
 * row is keyed by game and seat), so the row's position in its page is its key: a page is always
 * replaced whole.
 */
interface GridRow {
  key: string;
  values: Readonly<Record<string, unknown>>;
}

/**
 * Read-only browser of the log tables (spec v7 §7.8, L80-10). The table is the route's
 * (`/admin/data/:table`), and `AdminApp` remounts the page on every route change (`key` on the
 * route), so a tab change starts over: page 1, no page count, and the old table's late answers
 * land in an unmounted page. The page keeps no table-keyed state of its own.
 */
export function AdminDataPage({ password, table }: AdminDataPageProps): ReactElement {
  const activeTable = table ?? DEFAULT_TABLE;
  const [pageNumber, setPageNumber] = useState(1);
  const listKey = `${activeTable}:${String(pageNumber)}`;
  const [page, setPage] = useState<AdminTablePage | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The last page count the server gave for this table. Paging keeps it, so the pager label (an
  // aria-live region) never announces a wrong total while the next page loads (as Matches, L80-06).
  const [knownPageCount, setKnownPageCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminTable(password, activeTable, {
      page: String(pageNumber),
      pageSize: String(PAGE_SIZE),
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
      setKnownPageCount(adminPageCount(result.data.total, result.data.pageSize));
      setLoadedKey(listKey);
      setError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [password, activeTable, pageNumber, listKey]);

  const loaded = loadedKey === listKey;
  const visiblePage = loaded ? page : null;
  // Until the page for this key loads the total is the last one known for this table, never below
  // the page itself ("Page 2 of 3" while page 2 loads, never "Page 2 of 2"). A fresh mount knows
  // nothing, so its pager reads "Page 1 of 1" until its first page loads.
  const pagerCount =
    visiblePage === null
      ? Math.max(knownPageCount ?? 1, pageNumber)
      : adminPageCount(visiblePage.total, visiblePage.pageSize);

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Database"
        description="Read-only view of log tables. Large fields are shortened in the grid."
      />
      {/* A table outside TABLES (a deep link to `/admin/data/nope`) matches no link: none is current. */}
      <AdminLinkBar label="Database tables" links={TABLE_LINKS} currentHref={`/admin/data/${activeTable}`} />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="quiet"
          disabled={visiblePage === null}
          onClick={() => {
            if (visiblePage !== null) {
              void exportTablePageXlsx(visiblePage);
            }
          }}
        >
          Download spreadsheet (this page)
        </Button>
        {visiblePage !== null ? (
          <p className={`${ADMIN_BODY_TEXT_CLASS} text-v7-text-2`}>
            {formatCount(visiblePage.total)} rows · page {visiblePage.page}
          </p>
        ) : null}
      </div>
      {!loaded ? <AdminStatus state={{ kind: 'loading' }} /> : null}
      {loaded && error !== null ? <AdminStatus state={{ kind: 'error', message: error }} /> : null}
      {visiblePage !== null ? (
        <AdminDataTable
          label={tableDisplayName(activeTable)}
          columns={gridColumns(visiblePage)}
          rows={visiblePage.rows.map((values, index) => ({ key: String(index), values }))}
          rowKey={(row) => row.key}
          emptyMessage="No rows in this table."
        />
      ) : null}
      <AdminPager
        page={pageNumber}
        pageCount={pagerCount}
        onPage={setPageNumber}
        disabled={visiblePage === null}
      />
    </div>
  );
}

/**
 * The columns the server names, Title Case headers (`columnDisplayName`). A cell is cut with an
 * ellipsis at 16rem, so a long id or a JSON preview cannot widen the grid.
 */
function gridColumns(page: AdminTablePage): AdminTableColumn<GridRow>[] {
  return page.columns.map((column) => ({
    id: column.name,
    header: columnDisplayName(column.name),
    cell: (row) => <span className="block max-w-[16rem] truncate">{formatCell(row.values[column.name])}</span>,
  }));
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record['_truncated'] === true) {
      return `Preview only (${String(record['totalBytes'])} bytes)`;
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}
