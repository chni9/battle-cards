/**
 * Shared admin pieces in V7 tool mode (technical spec v7 §7.8, L80-01). Every admin loading,
 * empty and error line is an `AdminStatus`, every table an `AdminDataTable`, and the nav and the
 * Database tabs an `AdminLinkBar`, so no page keeps a private copy. Class strings live in
 * `admin-classes.ts` (react-refresh: this file exports components only).
 */

import type { MouseEvent, ReactElement, ReactNode } from 'react';

import type { AdminLink } from '../../admin/admin-routes';
import {
  CHROME_OUTLINE_CLASS,
  CHROME_TRACK_CLASS,
  CHROME_TRACK_IDLE_CLASS,
  CHROME_TRACK_ITEM_CLASS,
  CHROME_TRACK_SELECTED_CLASS,
} from '../../ui/primitives/chrome-classes';
import { hasCommandModifier } from '../../ui/primitives/roving-focus';
import { ScrollArea } from '../../ui/primitives/scroll-area';
import { ADMIN_PANEL_CLASS, ADMIN_SECTION_TITLE_CLASS } from './admin-classes';

const BODY_TEXT_CLASS = 'font-v7-body text-v7-body font-bold';
const CAPTION_CLASS = 'font-v7-body text-v7-caption font-extrabold uppercase tracking-wide text-v7-text-2';

export type AdminStatusState =
  | { kind: 'loading' }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; message: string };

/**
 * One look for every admin wait, empty result and failure (spec v7 §7.8 "consistent loading,
 * empty and error states"). The error words stay `--text`: `--danger` marks the edge only, as
 * resource and threat colors are never body text (§5.1).
 */
export function AdminStatus({ state }: { state: AdminStatusState }): ReactElement {
  switch (state.kind) {
    case 'loading':
      return (
        <p role="status" className={`${BODY_TEXT_CLASS} text-v7-text-2`}>
          Loading…
        </p>
      );
    case 'empty':
      return <p className={`${ADMIN_PANEL_CLASS} text-center ${BODY_TEXT_CLASS} text-v7-text-2`}>{state.message}</p>;
    case 'error':
      return (
        <p role="alert" className={`border-l-4 border-v7-danger pl-3 ${BODY_TEXT_CLASS} text-v7-text`}>
          {state.message}
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
      <p className={`max-w-2xl ${BODY_TEXT_CLASS} text-v7-text-2`}>{description}</p>
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
      <dt className={CAPTION_CLASS}>{label}</dt>
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

const HEAD_CELL_CLASS = `px-3 py-2.5 ${CAPTION_CLASS}`;
const BODY_CELL_CLASS = `px-3 py-2.5 align-top ${BODY_TEXT_CLASS} text-v7-text`;

/**
 * Every admin table. `label` is required: any table can overflow a 390 px phone, so it scrolls
 * sideways inside a named region (ScrollArea contract, L53-07) and the page never does. Rows are
 * split by 1 px tool-line borders (`--ink` in tool mode).
 */
export function AdminDataTable<Row>({
  label,
  columns,
  rows,
  rowKey,
  emptyMessage = 'No rows match the current filters.',
}: {
  label: string;
  columns: readonly AdminTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  emptyMessage?: string;
}): ReactElement {
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
              <tr key={rowKey(row)} className="border-t border-v7-ink hover:bg-v7-panel-2">
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={`${BODY_CELL_CLASS} ${column.align === 'right' ? 'text-right tabular-nums' : ''}`}
                  >
                    {column.cell(row)}
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
