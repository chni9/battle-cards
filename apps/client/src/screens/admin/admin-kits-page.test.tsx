// @vitest-environment happy-dom
import type { AdminKitStatRow } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportKitStatsXlsx } from '../../export/admin-xlsx';
import { renderUi } from '../../test/render';
import { AdminKitsPage } from './admin-kits-page';
import { makeKitStats } from './admin-fixtures';
import { installFakeFetch } from './admin-test-harness';

// No test writes a file: the page only has to hand the loaded rows to the exporter.
vi.mock('../../export/admin-xlsx', () => ({ exportKitStatsXlsx: vi.fn() }));
const exportKitStats = vi.mocked(exportKitStatsXlsx);

afterEach(() => {
  exportKitStats.mockClear();
});

const KIT_STATS_PATH = '/api/admin/kit-stats';
const EMPTY_COPY = 'No kit data for these filters.';

function kitRow(kitId: AdminKitStatRow['kitId'], overrides: Partial<AdminKitStatRow> = {}): AdminKitStatRow {
  return { kitId, picks: 0, wins: 0, pickRate: 0, winRate: 0, ...overrides };
}

function downloadButton(): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Download spreadsheet' });
}

/** The first cell of each body row: the kit column, in order. */
function kitCells(): string[] {
  const table = within(screen.getByRole('region', { name: 'Kit stats' })).getByRole('table');
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '');
}

describe('AdminKitsPage (technical spec v7 §7.8, L80-08)', () => {
  it('shows Loading… before the first response', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminKitsPage password="secret" />);
    expect(fake.last(KIT_STATS_PATH).headers['x-inbox-password']).toBe('secret');
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    // Nothing is known yet: neither the empty copy nor a table nor a sample size.
    expect(screen.queryByText(EMPTY_COPY)).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText(/^Based on /)).toBeNull();
    expect(downloadButton().disabled).toBe(true);

    await fake.last(KIT_STATS_PATH).respond(200, makeKitStats([kitRow('kamikaze')], 1));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('table')).not.toBeNull();
  });

  it('renders rows by kit display name with the five columns', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminKitsPage password="secret" />);
    await fake.last(KIT_STATS_PATH).respond(
      200,
      makeKitStats(
        [
          kitRow('kamikaze', { picks: 3, wins: 1, pickRate: 0.75, winRate: 1 / 3 }),
          kitRow('assassin', { picks: 1, wins: 0, pickRate: 0.25, winRate: 0 }),
        ],
        4,
      ),
    );

    const table = within(screen.getByRole('region', { name: 'Kit stats' })).getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toStrictEqual([
      'Kit',
      'Times picked',
      'Wins',
      'Share of picks',
      'Win rate',
    ]);
    const [, kamikaze, assassin] = within(table).getAllByRole('row');
    if (kamikaze === undefined || assassin === undefined) throw new Error('Expected two body rows');
    expect(within(kamikaze).getAllByRole('cell').map((cell) => cell.textContent)).toStrictEqual([
      'Kamikaze',
      '3',
      '1',
      '75.0%',
      '33.3%',
    ]);
    expect(within(assassin).getAllByRole('cell')[0]?.textContent).toBe('Assassin');
    expect(screen.getByText('Based on 4 matches')).not.toBeNull();
    expect(downloadButton().disabled).toBe(false);
  });

  it('zero rows show the empty copy', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminKitsPage password="secret" />);
    await fake.last(KIT_STATS_PATH).respond(200, makeKitStats([], 0));

    expect(screen.getByText(EMPTY_COPY)).not.toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Based on 0 matches')).not.toBeNull();
    expect(downloadButton().disabled).toBe(true);
  });

  it('an older response arriving after Apply is ignored', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminKitsPage password="secret" />);
    const older = fake.last(KIT_STATS_PATH);
    expect(older.url.searchParams.has('bots')).toBe(false);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Opponents' }), 'humans');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(fake.to(KIT_STATS_PATH)).toHaveLength(2);
    const newer = fake.last(KIT_STATS_PATH);
    expect(newer.url.searchParams.get('bots')).toBe('humans');

    await newer.respond(200, makeKitStats([kitRow('assassin', { picks: 2 })], 2));
    expect(kitCells()).toStrictEqual(['Assassin']);

    await older.respond(200, makeKitStats([kitRow('kamikaze', { picks: 9 })], 9));
    expect(kitCells()).toStrictEqual(['Assassin']);
    expect(screen.getByText('Based on 2 matches')).not.toBeNull();
    expect(screen.queryByText('Based on 9 matches')).toBeNull();
  });

  it('an older error arriving after Apply is ignored', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminKitsPage password="secret" />);
    const older = fake.last(KIT_STATS_PATH);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Opponents' }), 'withBots');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await fake.last(KIT_STATS_PATH).respond(200, makeKitStats([kitRow('assassin', { picks: 2 })], 2));
    await older.respond(503);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(kitCells()).toStrictEqual(['Assassin']);
  });

  it('an error shows an alert and clears the previous table', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminKitsPage password="secret" />);
    await fake.last(KIT_STATS_PATH).respond(200, makeKitStats([kitRow('kamikaze', { picks: 3 })], 3));
    expect(kitCells()).toStrictEqual(['Kamikaze']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Opponents' }), 'humans');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    // While the new filters load, the old table and sample size are gone, not stale.
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText(/^Based on /)).toBeNull();
    expect(screen.queryByText(EMPTY_COPY)).toBeNull();

    await fake.last(KIT_STATS_PATH).respond(503);
    expect(screen.getByRole('alert').textContent).toBe('Database unavailable');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    // An error is not "no data": the empty copy stays away and so does the sample size.
    expect(screen.queryByText(EMPTY_COPY)).toBeNull();
    expect(screen.queryByText(/^Based on /)).toBeNull();
    expect(downloadButton().disabled).toBe(true);
  });

  it('a later success clears the alert', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminKitsPage password="secret" />);
    await fake.last(KIT_STATS_PATH).respond(503);
    expect(screen.getByRole('alert')).not.toBeNull();

    // Apply with the filters unchanged asks for nothing again, so the retry changes one.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Opponents' }), 'humans');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await fake.last(KIT_STATS_PATH).respond(200, makeKitStats([kitRow('kamikaze')], 1));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(kitCells()).toStrictEqual(['Kamikaze']);
  });

  it('Download spreadsheet exports raw kit ids', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminKitsPage password="secret" />);
    const stats = makeKitStats([kitRow('kamikaze', { picks: 3 }), kitRow('assassin', { picks: 1 })], 4);
    await fake.last(KIT_STATS_PATH).respond(200, stats);

    await user.click(downloadButton());
    expect(exportKitStats).toHaveBeenCalledTimes(1);
    // The exporter gets the loaded rows as the server sent them: raw `kitId`s, not display names.
    expect(exportKitStats).toHaveBeenCalledWith(stats.rows);
    expect(stats.rows.map((row) => row.kitId)).toStrictEqual(['kamikaze', 'assassin']);
  });
});
