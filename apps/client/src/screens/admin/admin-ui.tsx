import type { ReactElement, ReactNode } from 'react';

const tableShellClassName = [
  'overflow-hidden rounded-[length:var(--radius-card)] border border-border bg-surface-raised',
].join(' ');

const tableClassName = 'w-full min-w-[32rem] border-collapse text-left text-sm';

const headCellClassName =
  'border-b border-border bg-surface px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted';

const bodyCellClassName = 'border-b border-border-soft px-3 py-2.5 text-ink align-top';

export function AdminPageIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}): ReactElement {
  return (
    <header className="space-y-1">
      <h2 className="font-sans text-xl font-semibold tracking-tight text-ink">{title}</h2>
      <p className="max-w-2xl text-sm text-ink-muted">{description}</p>
    </header>
  );
}

export function AdminMetricGrid({ children }: { children: ReactNode }): ReactElement {
  return <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</dl>;
}

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
    <div className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised px-4 py-3.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-1.5 font-sans text-2xl font-semibold tabular-nums tracking-tight text-ink">
        {value}
      </dd>
      {hint !== undefined ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export interface AdminTableColumn<Row> {
  id: string;
  header: string;
  align?: 'left' | 'right';
  cell: (row: Row) => ReactNode;
}

export function AdminDataTable<Row>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No rows match the current filters.',
}: {
  columns: readonly AdminTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  emptyMessage?: string;
}): ReactElement {
  if (rows.length === 0) {
    return (
      <p className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised px-4 py-8 text-center text-sm text-ink-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={tableShellClassName}>
      <div className="overflow-x-auto">
        <table className={tableClassName}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`${headCellClassName} ${column.align === 'right' ? 'text-right' : ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-surface/80">
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={`${bodyCellClassName} ${column.align === 'right' ? 'text-right tabular-nums' : ''}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
