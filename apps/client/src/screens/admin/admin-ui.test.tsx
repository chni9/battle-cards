// @vitest-environment happy-dom
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { adminPageCount } from '../../admin/admin-paging';
import { renderUi } from '../../test/render';
import { AdminDataTable, AdminPager, AdminStatus, type AdminTableColumn } from './admin-ui';

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

  it('AdminDataTable with onRowOpen puts a named button on each row and opens on Enter or Space', async () => {
    const onRowOpen = vi.fn<(row: KitRow) => void>();
    const gambler: KitRow = { kit: 'Gambler', picks: 4 };
    const spy: KitRow = { kit: 'Spy', picks: 2 };
    const { user } = renderUi(
      <AdminDataTable
        label="Kit stats"
        columns={columns}
        rows={[gambler, spy]}
        rowKey={(row) => row.kit}
        onRowOpen={onRowOpen}
        rowOpenLabel={(row) => `Open kit ${row.kit}`}
      />,
    );
    const gamblerButton = screen.getByRole('button', { name: 'Open kit Gambler' });
    const spyButton = screen.getByRole('button', { name: 'Open kit Spy' });
    // The button sits in the first column, so it is the first Tab stop of its row.
    expect(gamblerButton.closest('td')?.textContent).toBe('Gambler');
    expect(spyButton.closest('td')?.textContent).toBe('Spy');

    gamblerButton.focus();
    await user.keyboard('{Enter}');
    expect(onRowOpen).toHaveBeenCalledTimes(1);
    expect(onRowOpen).toHaveBeenLastCalledWith(gambler);

    await user.keyboard(' ');
    expect(onRowOpen).toHaveBeenCalledTimes(2);
    expect(onRowOpen).toHaveBeenLastCalledWith(gambler);

    // A mouse click on another cell of the row opens it once, not once per handler.
    const spyRow = spyButton.closest('tr');
    if (spyRow === null) throw new Error('The Spy button is not inside a row');
    await user.click(within(spyRow).getByText('2'));
    expect(onRowOpen).toHaveBeenCalledTimes(3);
    expect(onRowOpen).toHaveBeenLastCalledWith(spy);

    // Clicking the button itself does not also bubble to the row.
    await user.click(spyButton);
    expect(onRowOpen).toHaveBeenCalledTimes(4);
  });

  it('AdminDataTable without onRowOpen has no row buttons', () => {
    renderUi(<AdminDataTable label="Kit stats" columns={columns} rows={[{ kit: 'Spy', picks: 2 }]} rowKey={(row) => row.kit} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('AdminPager (technical spec v7 §7.8, L80-06)', () => {
  it('AdminPager reads Page N of M and disables Previous on page 1 and Next on the last page', async () => {
    const onPage = vi.fn<(page: number) => void>();
    const { rerender, user } = renderUi(<AdminPager page={1} pageCount={3} onPage={onPage} />);
    const nav = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(nav).getByText('Page 1 of 3')).not.toBeNull();
    const previous = within(nav).getByRole<HTMLButtonElement>('button', { name: 'Previous' });
    const next = within(nav).getByRole<HTMLButtonElement>('button', { name: 'Next' });
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    await user.click(next);
    expect(onPage).toHaveBeenLastCalledWith(2);

    rerender(<AdminPager page={2} pageCount={3} onPage={onPage} />);
    expect(within(nav).getByText('Page 2 of 3')).not.toBeNull();
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(false);
    await user.click(previous);
    expect(onPage).toHaveBeenLastCalledWith(1);

    rerender(<AdminPager page={3} pageCount={3} onPage={onPage} />);
    expect(within(nav).getByText('Page 3 of 3')).not.toBeNull();
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(true);
    expect(onPage).toHaveBeenCalledTimes(2);
  });

  it('the page text is a polite live region', () => {
    renderUi(<AdminPager page={2} pageCount={3} onPage={vi.fn()} />);
    expect(screen.getByText('Page 2 of 3').getAttribute('aria-live')).toBe('polite');
  });

  it('zero rows read Page 1 of 1 and disable both buttons', () => {
    renderUi(<AdminPager page={1} pageCount={adminPageCount(0, 50)} onPage={vi.fn()} />);
    expect(screen.getByText('Page 1 of 1')).not.toBeNull();
    expect(screen.queryByText('Page 1 of 0')).toBeNull();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Previous' }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Next' }).disabled).toBe(true);
  });

  it('disabled turns both buttons off while a page loads', () => {
    renderUi(<AdminPager page={2} pageCount={3} onPage={vi.fn()} disabled />);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Previous' }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Next' }).disabled).toBe(true);
  });
});
