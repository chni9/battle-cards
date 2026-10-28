/**
 * Shared admin pieces in V7 tool mode (technical spec v7 §7.8, L80-01). Every admin loading,
 * empty and error line is an `AdminStatus`, every table an `AdminDataTable`, the paged tables
 * (Matches, Database) an `AdminPager`, and the nav and the Database tabs an `AdminLinkBar`, so
 * no page keeps a private copy. Class strings live in
 * `admin-classes.ts` (react-refresh: this file exports components only).
 */

import type { MouseEvent, ReactElement, ReactNode } from 'react';

import type { AdminLink } from '../../admin/admin-routes';
import { Button } from '../../ui/primitives/button';
import {
  CHROME_FOCUS_CLASS,
  CHROME_OUTLINE_CLASS,
  CHROME_TRACK_CLASS,
  CHROME_TRACK_IDLE_CLASS,
  CHROME_TRACK_ITEM_CLASS,
  CHROME_TRACK_SELECTED_CLASS,
} from '../../ui/primitives/chrome-classes';
import { Icon } from '../../ui/icons/icon';
import { hasCommandModifier } from '../../ui/primitives/roving-focus';
import { ScrollArea } from '../../ui/primitives/scroll-area';
import {
  ADMIN_BODY_TEXT_CLASS,
  ADMIN_CAPTION_CLASS,
  ADMIN_PANEL_CLASS,
  ADMIN_SECTION_TITLE_CLASS,
} from './admin-classes';

export type AdminStatusState =
  | { kind: 'loading' }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; message: string };

/**
 * One look for every admin wait, empty result and failure (spec v7 §7.8 "consistent loading,
 * empty and error states"). An error is a `--panel` box with a full 1 px `--danger` outline and
 * the `eliminated` cross, so it is never told by color alone (WCAG 1.4.1). Its words stay
 * `--text`: `--danger` text is under 4.5:1 on `--panel-2`, and resource and threat colors are
 * never body text (§5.1).
 */
export function AdminStatus({ state }: { state: AdminStatusState }): ReactElement {
  switch (state.kind) {
    case 'loading':
      return (
        <p role="status" className={`${ADMIN_BODY_TEXT_CLASS} text-v7-text-2`}>
          Loading…
        </p>
      );
    case 'empty':
      return <p className={`${ADMIN_PANEL_CLASS} text-center ${ADMIN_BODY_TEXT_CLASS} text-v7-text-2`}>{state.message}</p>;
    case 'error':
      return (
        <p
          role="alert"
          className={[
            'flex items-start gap-2 rounded-v7-chrome-sm px-3 py-2',
            'border-(length:--chrome-outline-width) border-v7-danger bg-v7-panel',
            ADMIN_BODY_TEXT_CLASS,
            'text-v7-text',
          ].join(' ')}
        >
          <Icon name="eliminated" size={18} className="shrink-0" />
          <span className="min-w-0">{state.message}</span>
        </p>
      );
  }
}

/** A plain primary click routes in place; any modified click stays the browser's (new tab, window). */
function followInPlace(event: MouseEvent<HTMLAnchorElement>, href: string): void {
  if (event.button !== 0 || event.shiftKey || hasCommandModifier(event)) return;
  event.preventDefault();
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Section links on the Tabs track look (L72-08 chrome). They are links with `aria-current`, not
 * ARIA tabs: each one changes the URL and the route rather than a panel in place (L80-01). The
 * shell re-routes on the `popstate` a plain click dispatches. The track wraps at 390 px.
 */
export function AdminLinkBar({
  label,
  links,
  currentHref,
}: {
  label: string;
  links: readonly AdminLink[];
  currentHref: string | null;
}): ReactElement {
  return (
    <nav aria-label={label}>
      <div className={`${CHROME_TRACK_CLASS} flex-wrap`}>
        {links.map((link) => {
          const current = link.href === currentHref;
          return (
            <a
              key={link.href}
              href={link.href}
              {...(current ? { 'aria-current': 'page' as const } : {})}
              className={[
                CHROME_TRACK_ITEM_CLASS,
                'inline-flex items-center px-3',
                current ? CHROME_TRACK_SELECTED_CLASS : `${CHROME_TRACK_IDLE_CLASS} hover:text-v7-text`,
              ].join(' ')}
              onClick={(event) => {
                followInPlace(event, link.href);
              }}
            >
              {link.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export function AdminPageIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}): ReactElement {
  return (
    <header className="space-y-1">
      <h2 className={ADMIN_SECTION_TITLE_CLASS}>{title}</h2>
      <p className={`max-w-2xl ${ADMIN_BODY_TEXT_CLASS} text-v7-text-2`}>{description}</p>
    </header>
  );
}

export function AdminMetricGrid({ children }: { children: ReactNode }): ReactElement {
  return <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</dl>;
}

/** The hint is a second `dd` of the same term: a `p` is not allowed inside a `dl` group. */
export function AdminMetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}): ReactElement {
  return (
    <div className={ADMIN_PANEL_CLASS}>
      <dt className={ADMIN_CAPTION_CLASS}>{label}</dt>
      <dd className="mt-1.5 font-v7-display text-v7-vital tabular-nums text-v7-text">{value}</dd>
      {hint !== undefined ? (
        <dd className="mt-1 font-v7-body text-v7-caption font-bold text-v7-text-2">{hint}</dd>
      ) : null}
    </div>
  );
}

export interface AdminTableColumn<Row> {
  id: string;
  header: string;
  align?: 'left' | 'right';
  cell: (row: Row) => ReactNode;
}

const HEAD_CELL_CLASS = `px-3 py-2.5 ${ADMIN_CAPTION_CLASS}`;
const BODY_CELL_CLASS = `px-3 py-2.5 align-top ${ADMIN_BODY_TEXT_CLASS} text-v7-text`;
/** The row-open button reads as the cell's text, with an underline on hover and the focus ring. */
const ROW_OPEN_CLASS = `rounded-v7-chrome-sm text-left underline-offset-2 hover:underline ${CHROME_FOCUS_CLASS}`;

/**
 * A row can open (Matches) or not. Both props come together: a button with no name would be
 * unreachable by assistive technology, so the type refuses an `onRowOpen` without a label.
 */
type AdminRowOpenProps<Row> =
  | { onRowOpen?: undefined; rowOpenLabel?: undefined }
  | { onRowOpen: (row: Row) => void; rowOpenLabel: (row: Row) => string };

type AdminDataTableProps<Row> = {
  label: string;
  columns: readonly AdminTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  emptyMessage?: string;
} & AdminRowOpenProps<Row>;

/**
 * Every admin table. `label` is required: any table can overflow a 390 px phone, so it scrolls
 * sideways inside a named region (ScrollArea contract, L53-07) and the page never does. Rows are
 * split by 1 px tool-line borders (`--ink` in tool mode).
 *
 * With `onRowOpen` the first column's cell holds a real `<button>` named by `rowOpenLabel`, so
 * Tab, Enter and Space work natively and a dialog opened from it can hand focus back to it
 * (L80-06; `decisions.md` 2026-10-28). The whole row stays clickable for the mouse; the button
 * stops its click so a press opens once.
 */
export function AdminDataTable<Row>({
  label,
  columns,
  rows,
  rowKey,
  emptyMessage = 'No rows match the current filters.',
  onRowOpen,
  rowOpenLabel,
}: AdminDataTableProps<Row>): ReactElement {
  if (rows.length === 0) {
    return <AdminStatus state={{ kind: 'empty', message: emptyMessage }} />;
  }

  return (
    <div className={`${CHROME_OUTLINE_CLASS} overflow-hidden rounded-v7-chrome bg-v7-panel`}>
      <ScrollArea axis="x" label={label} focusRing="inset">
        <table className="w-full min-w-[32rem] border-collapse text-left">
          <thead className="bg-v7-panel-2">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={`${HEAD_CELL_CLASS} ${column.align === 'right' ? 'text-right' : ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={`border-t border-v7-ink hover:bg-v7-panel-2${onRowOpen !== undefined ? ' cursor-pointer' : ''}`}
                {...(onRowOpen !== undefined
                  ? {
                      onClick: () => {
                        onRowOpen(row);
                      },
                    }
                  : {})}
              >
                {columns.map((column, index) => (
                  <td
                    key={column.id}
                    className={`${BODY_CELL_CLASS} ${column.align === 'right' ? 'text-right tabular-nums' : ''}`}
                  >
                    {onRowOpen !== undefined && index === 0 ? (
                      <button
                        type="button"
                        aria-label={rowOpenLabel(row)}
                        className={ROW_OPEN_CLASS}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRowOpen(row);
                        }}
                      >
                        {column.cell(row)}
                      </button>
                    ) : (
                      column.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}

/**
 * Previous / Page N of M / Next under a paged table (Matches, Database; spec v7 §7.8, L80-06).
 * Previous is off on page 1 and Next on the last page; `disabled` turns both off while a page
 * loads. The caller passes `adminPageCount`, which is never below 1, so an empty list reads
 * "Page 1 of 1". The count is `aria-live` so a screen reader hears the page change.
 */
export function AdminPager({
  page,
  pageCount,
  onPage,
  disabled = false,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center gap-3">
      <Button
        variant="quiet"
        disabled={disabled || page <= 1}
        onClick={() => {
          onPage(page - 1);
        }}
      >
        Previous
      </Button>
      <p aria-live="polite" className={`${ADMIN_BODY_TEXT_CLASS} tabular-nums text-v7-text-2`}>
        {`Page ${String(page)} of ${String(pageCount)}`}
      </p>
      <Button
        variant="quiet"
        disabled={disabled || page >= pageCount}
        onClick={() => {
          onPage(page + 1);
        }}
      >
        Next
      </Button>
    </nav>
  );
}
