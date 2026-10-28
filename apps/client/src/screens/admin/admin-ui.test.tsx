// @vitest-environment happy-dom
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { AdminDataTable, AdminStatus, type AdminTableColumn } from './admin-ui';

interface KitRow {
  kit: string;
  picks: number;
}

const columns: readonly AdminTableColumn<KitRow>[] = [
  { id: 'kit', header: 'Kit', cell: (row) => row.kit },
  { id: 'picks', header: 'Times picked', align: 'right', cell: (row) => row.picks },
];

describe('admin shared pieces (technical spec v7 §7.8, L80-01)', () => {
  it('AdminStatus shows Loading… as a status, the empty message as text, and an error as an alert', () => {
    const { rerender } = renderUi(<AdminStatus state={{ kind: 'loading' }} />);
    expect(screen.getByRole('status').textContent).toBe('Loading…');

    rerender(<AdminStatus state={{ kind: 'empty', message: 'No kit data for these filters.' }} />);
    expect(screen.getByText('No kit data for these filters.')).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();

    rerender(<AdminStatus state={{ kind: 'error', message: 'Database unavailable' }} />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Database unavailable');
    // Marked by a glyph as well as the --danger outline, never by color alone (WCAG 1.4.1).
    expect(alert.querySelector('svg[data-icon="eliminated"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('AdminDataTable renders the empty message instead of an empty table', () => {
    renderUi(
      <AdminDataTable
        label="Kit stats"
        columns={columns}
        rows={[]}
        rowKey={(row) => row.kit}
        emptyMessage="No kit data for these filters."
      />,
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('No kit data for these filters.')).not.toBeNull();
  });

  it('AdminDataTable falls back to the filter message when no empty message is given', () => {
    renderUi(<AdminDataTable label="Kit stats" columns={columns} rows={[]} rowKey={(row) => row.kit} />);
    expect(screen.getByText('No rows match the current filters.')).not.toBeNull();
  });

  it('AdminDataTable renders headers and rows inside a labelled horizontal scroll region', () => {
    renderUi(
      <AdminDataTable
        label="Kit stats"
        columns={columns}
        rows={[
          { kit: 'Gambler', picks: 4 },
          { kit: 'Spy', picks: 2 },
        ]}
        rowKey={(row) => row.kit}
      />,
    );
    const region = screen.getByRole('region', { name: 'Kit stats' });
    expect(region.getAttribute('data-scroll-axis')).toBe('x');
    const table = within(region).getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toStrictEqual([
      'Kit',
      'Times picked',
    ]);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toStrictEqual([
      ['Gambler', '4'],
      ['Spy', '2'],
    ]);
  });
});
