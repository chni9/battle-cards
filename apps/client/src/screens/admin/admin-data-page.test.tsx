// @vitest-environment happy-dom
import { screen, within } from '@testing-library/react';
import { useEffect, useState, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminRoute } from '../../admin/admin-routes';
import { exportTablePageXlsx } from '../../export/admin-xlsx';
import { renderUi } from '../../test/render';
import { AdminDataPage } from './admin-data-page';
import { makeTablePage } from './admin-fixtures';
import { installFakeFetch, setAdminPath } from './admin-test-harness';

// No test writes a file: the page only has to hand the loaded page to the exporter.
vi.mock('../../export/admin-xlsx', () => ({ exportTablePageXlsx: vi.fn() }));
const exportTablePage = vi.mocked(exportTablePageXlsx);

afterEach(() => {
  exportTablePage.mockClear();
});

const EMPTY_COPY = 'No rows in this table.';

function tablePath(table: string): string {
  return `/api/admin/tables/${table}`;
}

/**
 * What `AdminApp` does around the page: the table comes from the URL, and every `popstate` (a tab
 * link's plain click fires one) remounts the page, so its state starts over.
 */
function RoutedDataPage(): ReactElement {
  const [routeKey, setRouteKey] = useState(0);
  useEffect(() => {
    const onPop = (): void => {
      setRouteKey((value) => value + 1);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
    };
  }, []);
  return <AdminDataPage key={routeKey} password="secret" table={adminRoute(window.location.pathname).table} />;
}

function tabLinks(): HTMLElement[] {
  return within(screen.getByRole('navigation', { name: 'Database tables' })).getAllByRole('link');
}

function currentTabs(): (string | null)[] {
  return tabLinks()
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent);
}

function pagerButton(name: 'Previous' | 'Next'): HTMLButtonElement {
  return within(screen.getByRole('navigation', { name: 'Pages' })).getByRole<HTMLButtonElement>('button', { name });
}

function pageText(): string | null {
  return within(screen.getByRole('navigation', { name: 'Pages' })).getByText(/^Page \d+ of \d+$/).textContent;
}

function downloadButton(): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Download spreadsheet (this page)' });
}

/** The grid inside the region named after the table. */
function grid(regionName: string): HTMLElement {
  return within(screen.getByRole('region', { name: regionName })).getByRole('table');
}

describe('AdminDataPage (technical spec v7 §7.8, L80-10)', () => {
  it('defaults to Finished games and marks it current', () => {
    const fake = installFakeFetch();
    renderUi(<AdminDataPage password="secret" table={null} />);
    const call = fake.last(tablePath('finished_games'));
    expect(call.url.searchParams.get('page')).toBe('1');
    expect(call.url.searchParams.get('pageSize')).toBe('50');
    expect(call.headers['x-inbox-password']).toBe('secret');

    expect(currentTabs()).toStrictEqual(['Finished games']);
  });

  it('lists five tables in order with Chat messages last', () => {
    installFakeFetch();
    renderUi(<AdminDataPage password="secret" table={null} />);
    expect(tabLinks().map((link) => link.textContent)).toStrictEqual([
      'Finished games',
      'Players',
      'Eliminations',
      'Feedback',
      'Chat messages',
    ]);
    expect(tabLinks().map((link) => link.getAttribute('href'))).toStrictEqual([
      '/admin/data/finished_games',
      '/admin/data/finished_game_players',
      '/admin/data/finished_game_eliminations',
      '/admin/data/feedback_reports',
      '/admin/data/game_chat_messages',
    ]);
  });

  it('marks the tab of the routed table current', () => {
    const fake = installFakeFetch();
    renderUi(<AdminDataPage password="secret" table="feedback_reports" />);
    expect(fake.to(tablePath('feedback_reports'))).toHaveLength(1);
    expect(currentTabs()).toStrictEqual(['Feedback']);
  });

  it('shows Loading… until the first page, with the pager and the export off', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminDataPage password="secret" table={null} />);
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText(EMPTY_COPY)).toBeNull();
    // Nothing is known yet, so the pager reads one page and cannot be used.
    expect(pageText()).toBe('Page 1 of 1');
    expect(pagerButton('Previous').disabled).toBe(true);
    expect(pagerButton('Next').disabled).toBe(true);
    expect(downloadButton().disabled).toBe(true);

    await fake.last(tablePath('finished_games')).respond(200, makeTablePage('finished_games', [{ id: 'g-1' }]));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('table')).not.toBeNull();
  });

  it('switching tables requests page=1&pageSize=50 for the new table and never shows the old rows', async () => {
    setAdminPath('/admin/data');
    const fake = installFakeFetch();
    const { user } = renderUi(<RoutedDataPage />);
    await fake.last(tablePath('finished_games')).respond(
      200,
      makeTablePage('finished_games', [{ id: 'old-game-1' }], { total: 120 }),
    );
    // Page 2 first, so the new table starting at page 1 is the page state starting over.
    await user.click(pagerButton('Next'));
    expect(fake.last(tablePath('finished_games')).url.searchParams.get('page')).toBe('2');
    await fake.last(tablePath('finished_games')).respond(
      200,
      makeTablePage('finished_games', [{ id: 'old-game-51' }], { page: 2, total: 120 }),
    );
    expect(screen.getByText('old-game-51')).not.toBeNull();

    await user.click(screen.getByRole('link', { name: 'Players' }));
    expect(window.location.pathname).toBe('/admin/data/finished_game_players');
    const players = fake.last(tablePath('finished_game_players'));
    expect(players.url.searchParams.get('page')).toBe('1');
    expect(players.url.searchParams.get('pageSize')).toBe('50');
    // The old rows are gone before the new answer; so are the old table's page count and its tab.
    expect(screen.queryByText('old-game-51')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    expect(pageText()).toBe('Page 1 of 1');
    expect(currentTabs()).toStrictEqual(['Players']);

    await players.respond(200, makeTablePage('finished_game_players', [{ game_id: 'new-game-1' }]));
    expect(screen.getByText('new-game-1')).not.toBeNull();
    expect(screen.queryByText('old-game-51')).toBeNull();
    expect(grid('Players')).not.toBeNull();
  });

  it('Next requests page=2, Previous is disabled on page 1, Next is disabled on the last page', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminDataPage password="secret" table={null} />);
    await fake.last(tablePath('finished_games')).respond(
      200,
      makeTablePage('finished_games', [{ id: 'page-1-row' }], { total: 120 }),
    );
    expect(pageText()).toBe('Page 1 of 3');
    expect(pagerButton('Previous').disabled).toBe(true);
    expect(pagerButton('Next').disabled).toBe(false);

    await user.click(pagerButton('Next'));
    expect(fake.to(tablePath('finished_games'))).toHaveLength(2);
    const second = fake.last(tablePath('finished_games'));
    expect(second.url.searchParams.get('page')).toBe('2');
    expect(second.url.searchParams.get('pageSize')).toBe('50');
    // The label is an aria-live region: while page 2 loads it keeps the last known total rather
    // than announcing "Page 2 of 2", and the pager cannot be pressed again.
    expect(pageText()).toBe('Page 2 of 3');
    expect(pagerButton('Previous').disabled).toBe(true);
    expect(pagerButton('Next').disabled).toBe(true);
    await second.respond(200, makeTablePage('finished_games', [{ id: 'page-2-row' }], { page: 2, total: 120 }));
    expect(pageText()).toBe('Page 2 of 3');
    expect(screen.getByText('page-2-row')).not.toBeNull();
    expect(screen.queryByText('page-1-row')).toBeNull();
    expect(pagerButton('Previous').disabled).toBe(false);
    expect(pagerButton('Next').disabled).toBe(false);

    await user.click(pagerButton('Next'));
    expect(fake.last(tablePath('finished_games')).url.searchParams.get('page')).toBe('3');
    await fake.last(tablePath('finished_games')).respond(
      200,
      makeTablePage('finished_games', [{ id: 'page-3-row' }], { page: 3, total: 120 }),
    );
    expect(pageText()).toBe('Page 3 of 3');
    expect(pagerButton('Next').disabled).toBe(true);

    await user.click(pagerButton('Previous'));
    expect(fake.last(tablePath('finished_games')).url.searchParams.get('page')).toBe('2');
  });

  it('0 rows show the empty message, Page 1 of 1 and both pager buttons disabled', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminDataPage password="secret" table={null} />);
    await fake.last(tablePath('finished_games')).respond(200, makeTablePage('finished_games', []));
    expect(screen.getByText(EMPTY_COPY)).not.toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('0 rows · page 1')).not.toBeNull();
    expect(pageText()).toBe('Page 1 of 1');
    expect(pagerButton('Previous').disabled).toBe(true);
    expect(pagerButton('Next').disabled).toBe(true);
  });

  it('shows the row count and page of the loaded page', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminDataPage password="secret" table={null} />);
    expect(screen.queryByText(/ rows · page /)).toBeNull();
    await fake.last(tablePath('finished_games')).respond(
      200,
      makeTablePage('finished_games', [{ id: 'g-1' }], { total: 1234 }),
    );
    expect(screen.getByText('1,234 rows · page 1')).not.toBeNull();
  });

  it('a late response for the previous table is ignored', async () => {
    setAdminPath('/admin/data');
    const fake = installFakeFetch();
    const { user } = renderUi(<RoutedDataPage />);
    const lateGames = fake.last(tablePath('finished_games'));

    // Leave before the first answer: the table switch is the newer request.
    await user.click(screen.getByRole('link', { name: 'Players' }));
    await fake.last(tablePath('finished_game_players')).respond(
      200,
      makeTablePage('finished_game_players', [{ game_id: 'players-row' }]),
    );
    await lateGames.respond(200, makeTablePage('finished_games', [{ id: 'late-games-row' }]));

    expect(screen.queryByText('late-games-row')).toBeNull();
    expect(screen.getByText('players-row')).not.toBeNull();
    expect(screen.queryByRole('region', { name: 'Finished games' })).toBeNull();
    expect(currentTabs()).toStrictEqual(['Players']);
  });

  it('a late response is ignored and paging starts over when the table changes without a remount', async () => {
    // AdminApp remounts the page on every route change, so this guard never fires there; it
    // keeps the page correct on its own should that remount ever go.
    const fake = installFakeFetch();
    const { user, rerender } = renderUi(<AdminDataPage password="secret" table="finished_games" />);
    await fake.last(tablePath('finished_games')).respond(
      200,
      makeTablePage('finished_games', [{ id: 'g-1' }], { total: 120 }),
    );
    await user.click(pagerButton('Next'));
    const latePage2 = fake.last(tablePath('finished_games'));
    expect(latePage2.url.searchParams.get('page')).toBe('2');

    rerender(<AdminDataPage password="secret" table="finished_game_players" />);
    const players = fake.last(tablePath('finished_game_players'));
    expect(players.url.searchParams.get('page')).toBe('1');
    // Finished games' page count is not the players' count.
    expect(pageText()).toBe('Page 1 of 1');

    await players.respond(200, makeTablePage('finished_game_players', [{ game_id: 'players-row' }]));
    await latePage2.respond(200, makeTablePage('finished_games', [{ id: 'late-page-2-row' }], { page: 2, total: 120 }));
    expect(screen.queryByText('late-page-2-row')).toBeNull();
    expect(screen.getByText('players-row')).not.toBeNull();
    expect(pageText()).toBe('Page 1 of 1');
    expect(currentTabs()).toStrictEqual(['Players']);
  });

  it('the export button stays disabled until a page loads, then exports that page', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminDataPage password="secret" table="feedback_reports" />);
    expect(downloadButton().disabled).toBe(true);
    await user.click(downloadButton());
    expect(exportTablePage).not.toHaveBeenCalled();

    const loaded = makeTablePage('feedback_reports', [{ id: 'f-1' }, { id: 'f-2' }]);
    await fake.last(tablePath('feedback_reports')).respond(200, loaded);
    expect(downloadButton().disabled).toBe(false);
    await user.click(downloadButton());
    expect(exportTablePage).toHaveBeenCalledTimes(1);
    expect(exportTablePage).toHaveBeenCalledWith(loaded);
  });

  it('keeps the grid rules', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminDataPage password="secret" table="finished_game_players" />);
    await fake.last(tablePath('finished_game_players')).respond(
      200,
      makeTablePage('finished_game_players', [
        {
          game_id: 'g-1',
          seat_index: 0,
          is_winner: true,
          hand: null,
          special_cards: ['spy', 'thief'],
          action_log: { _truncated: true, previewBytes: 512, totalBytes: 900, preview: '[{"a":1' },
        },
      ]),
    );

    const table = grid('Players');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toStrictEqual([
      'Game Id',
      'Seat Index',
      'Is Winner',
      'Hand',
      'Special Cards',
      'Action Log',
    ]);
    const [, row] = within(table).getAllByRole('row');
    if (row === undefined) throw new Error('Expected one body row');
    const cells = within(row).getAllByRole('cell');
    expect(cells.map((cell) => cell.textContent)).toStrictEqual([
      'g-1',
      '0',
      'true',
      '—',
      '["spy","thief"]',
      'Preview only (900 bytes)',
    ]);
    // A long value is cut with an ellipsis at 16rem, not allowed to widen the grid.
    for (const cell of cells) {
      const content = cell.firstElementChild;
      expect(content?.classList.contains('truncate')).toBe(true);
      expect(content?.classList.contains('max-w-[16rem]')).toBe(true);
    }
  });

  it('the Chat messages tab requests game_chat_messages, is marked current and shows the Role column', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminDataPage password="secret" table="game_chat_messages" />);
    const call = fake.last(tablePath('game_chat_messages'));
    expect(call.url.searchParams.get('page')).toBe('1');
    expect(call.url.searchParams.get('pageSize')).toBe('50');
    expect(call.headers['x-inbox-password']).toBe('secret');
    expect(currentTabs()).toStrictEqual(['Chat messages']);

    await call.respond(
      200,
      makeTablePage('game_chat_messages', [
        { game_id: 'g-1', order_index: 0, sender_id: 's-1', nickname: 'Ada', role: 'living', body: 'hi', round_index: 0 },
        { game_id: 'g-1', order_index: 1, sender_id: 's-2', nickname: 'Bob', role: 'eliminated', body: 'gg', round_index: 3 },
        { game_id: 'g-1', order_index: 2, sender_id: 's-3', nickname: 'Cy', role: 'spectator', body: 'wow', round_index: 3 },
      ]),
    );
    const table = grid('Chat messages');
    const headers = within(table).getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toStrictEqual([
      'Game Id',
      'Order Index',
      'Sender Id',
      'Nickname',
      'Role',
      'Body',
      'Round Index',
    ]);
    const roleColumn = headers.indexOf('Role');
    const roles = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[roleColumn]?.textContent);
    expect(roles).toStrictEqual(['living', 'eliminated', 'spectator']);
    expect(currentTabs()).toStrictEqual(['Chat messages']);
  });

  it('exports admin-game_chat_messages.xlsx through the same export', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminDataPage password="secret" table="game_chat_messages" />);
    const loaded = makeTablePage('game_chat_messages', [
      { game_id: 'g-1', order_index: 0, sender_id: 's-1', nickname: 'Ada', role: 'living', body: 'hi', round_index: 0 },
    ]);
    await fake.last(tablePath('game_chat_messages')).respond(200, loaded);
    await user.click(downloadButton());
    // `exportTablePageXlsx` names the file after `page.table` (`admin-{table}.xlsx`), so the page
    // handed over is what makes the file `admin-game_chat_messages.xlsx`.
    expect(exportTablePage).toHaveBeenCalledTimes(1);
    expect(exportTablePage).toHaveBeenCalledWith(loaded);
    expect(exportTablePage.mock.calls[0]?.[0].table).toBe('game_chat_messages');
  });

  it('a deep link to an unknown table shows Not found and marks no tab current', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminDataPage password="secret" table="nope" />);
    expect(fake.last(tablePath('nope')).url.searchParams.get('page')).toBe('1');
    expect(screen.getByRole('status').textContent).toBe('Loading…');

    await fake.last(tablePath('nope')).respond(404, { error: 'Not found' });
    expect(screen.getByRole('alert').textContent).toBe('Not found');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText(EMPTY_COPY)).toBeNull();
    // The five tabs stay so the designer can leave, and none is current.
    expect(tabLinks()).toHaveLength(5);
    expect(currentTabs()).toStrictEqual([]);
    expect(downloadButton().disabled).toBe(true);
    expect(pageText()).toBe('Page 1 of 1');
  });

  it('a failed page shows an alert and clears the previous rows', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminDataPage password="secret" table={null} />);
    await fake.last(tablePath('finished_games')).respond(
      200,
      makeTablePage('finished_games', [{ id: 'page-1-row' }], { total: 120 }),
    );
    await user.click(pagerButton('Next'));
    await fake.last(tablePath('finished_games')).respond(503, { error: 'Database unavailable' });

    expect(screen.getByRole('alert').textContent).toBe('Database unavailable');
    expect(screen.queryByText('page-1-row')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText(EMPTY_COPY)).toBeNull();
    expect(downloadButton().disabled).toBe(true);
    // The tab still marks the table; only the rows failed.
    expect(currentTabs()).toStrictEqual(['Finished games']);
  });
});
