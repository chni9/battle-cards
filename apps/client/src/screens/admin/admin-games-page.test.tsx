// @vitest-environment happy-dom
import type { AdminGameListItem } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDateTime } from '../../admin/admin-present';
import { exportGamesListXlsx } from '../../export/admin-xlsx';
import { renderUi } from '../../test/render';
import { AdminGamesPage } from './admin-games-page';
import { makeGameDetail, makeGameListItem, makeGamesPage } from './admin-fixtures';
import { installFakeFetch, setAdminPath } from './admin-test-harness';

// No test writes a file: the page only has to hand the loaded page to the exporter.
vi.mock('../../export/admin-xlsx', () => ({ exportGamesListXlsx: vi.fn() }));
vi.mock('../../export/build-action-log-xlsx', () => ({
  buildActionLogWorkbook: vi.fn(),
  downloadWorkbookBuffer: vi.fn(),
}));
const exportGamesList = vi.mocked(exportGamesListXlsx);

afterEach(() => {
  exportGamesList.mockClear();
});

const GAMES_PATH = '/api/admin/games';
const PAGE_SIZE = 50;
const TOTAL = 120;

/**
 * Fifty items whose first room code is `first` (an id, upper-cased by the fixture); the others
 * are `<first>-2` … so a test can tell one page from another by its first row.
 */
function itemsStartingWith(first: string, count = PAGE_SIZE): AdminGameListItem[] {
  return Array.from({ length: count }, (_unused, index) =>
    makeGameListItem(index === 0 ? first : `${first}-${String(index + 1)}`),
  );
}

function pageOf(page: number, first: string, count = PAGE_SIZE): ReturnType<typeof makeGamesPage> {
  return makeGamesPage(itemsStartingWith(first, count), { page, pageSize: PAGE_SIZE, total: TOTAL });
}

function pagerButton(name: 'Previous' | 'Next'): HTMLButtonElement {
  return within(screen.getByRole('navigation', { name: 'Pages' })).getByRole<HTMLButtonElement>('button', { name });
}

/**
 * The pager buttons are `focusableWhenDisabled`: off is `aria-disabled`, never native `disabled`,
 * so a button pressed by keyboard keeps focus when it turns off (WCAG 2.4.3).
 */
function pagerOff(name: 'Previous' | 'Next'): boolean {
  const button = pagerButton(name);
  expect(button.hasAttribute('disabled')).toBe(false);
  return button.getAttribute('aria-disabled') === 'true';
}

function pageText(): string | null {
  return within(screen.getByRole('navigation', { name: 'Pages' })).getByText(/^Page \d+ of \d+$/).textContent;
}

/** Tab forward until `target` has focus. The table region is a Tab stop before the first row. */
async function tabTo(user: UserEvent, target: HTMLElement): Promise<void> {
  for (let step = 0; step < 40; step += 1) {
    await user.tab();
    if (document.activeElement === target) return;
  }
  throw new Error('Tab never reached the target');
}

describe('AdminGamesPage (technical spec v7 §7.8, L80-06)', () => {
  it('shows Loading… until the first page', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminGamesPage password="secret" detailId={null} />);
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    expect(screen.queryByRole('table')).toBeNull();
    // Nothing is known yet, so the pager reads one page and cannot be used.
    expect(pageText()).toBe('Page 1 of 1');
    expect(pagerOff('Previous')).toBe(true);
    expect(pagerOff('Next')).toBe(true);

    await fake.last(GAMES_PATH).respond(200, pageOf(1, 'page1a'));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('table')).not.toBeNull();
  });

  it('Next requests page=2, Previous is disabled on page 1, Next is disabled on the last page', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    expect(fake.last(GAMES_PATH).url.searchParams.get('page')).toBe('1');
    expect(fake.last(GAMES_PATH).headers['x-inbox-password']).toBe('secret');
    // The server default page size applies: the page sends no pageSize.
    expect(fake.last(GAMES_PATH).url.searchParams.has('pageSize')).toBe(false);

    await fake.last(GAMES_PATH).respond(200, pageOf(1, 'page1a'));
    expect(pageText()).toBe('Page 1 of 3');
    expect(pagerOff('Previous')).toBe(true);
    expect(pagerOff('Next')).toBe(false);

    await user.click(pagerButton('Next'));
    expect(fake.to(GAMES_PATH)).toHaveLength(2);
    expect(fake.last(GAMES_PATH).url.searchParams.get('page')).toBe('2');
    // The label sits in an aria-live region: while page 2 loads it keeps the last known total
    // rather than announcing "Page 2 of 2" first.
    expect(pageText()).toBe('Page 2 of 3');
    await fake.last(GAMES_PATH).respond(200, pageOf(2, 'page2a'));
    expect(pageText()).toBe('Page 2 of 3');
    expect(pagerOff('Previous')).toBe(false);
    expect(pagerOff('Next')).toBe(false);

    await user.click(pagerButton('Next'));
    expect(fake.last(GAMES_PATH).url.searchParams.get('page')).toBe('3');
    await fake.last(GAMES_PATH).respond(200, pageOf(3, 'page3a', TOTAL - 2 * PAGE_SIZE));
    expect(pageText()).toBe('Page 3 of 3');
    expect(pagerOff('Previous')).toBe(false);
    expect(pagerOff('Next')).toBe(true);

    await user.click(pagerButton('Previous'));
    expect(fake.last(GAMES_PATH).url.searchParams.get('page')).toBe('2');
  });

  it('Next pressed by keyboard keeps focus while the page loads and at the last page', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(200, pageOf(1, 'page1a'));
    // Fifty row buttons come first in Tab order, so focus Next directly; Enter is the keyboard press.
    const next = pagerButton('Next');
    next.focus();
    expect(document.activeElement).toBe(next);

    await user.keyboard('{Enter}');
    expect(fake.last(GAMES_PATH).url.searchParams.get('page')).toBe('2');
    // Off while page 2 loads, yet still the focused control: focus never drops to the body.
    expect(pagerOff('Next')).toBe(true);
    expect(document.activeElement).toBe(next);
    // An off button swallows the press, so a second Enter asks for nothing.
    await user.keyboard('{Enter}');
    expect(fake.to(GAMES_PATH)).toHaveLength(2);

    await fake.last(GAMES_PATH).respond(200, pageOf(2, 'page2a'));
    expect(document.activeElement).toBe(next);
    await user.keyboard('{Enter}');
    await fake.last(GAMES_PATH).respond(200, pageOf(3, 'page3a', TOTAL - 2 * PAGE_SIZE));
    // The end-stop turns Next off for good, and focus stays on it.
    expect(pageText()).toBe('Page 3 of 3');
    expect(pagerOff('Next')).toBe(true);
    expect(document.activeElement).toBe(next);
  });

  it('Apply after paging requests page=1', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(200, pageOf(1, 'page1a'));
    await user.click(pagerButton('Next'));
    await fake.last(GAMES_PATH).respond(200, pageOf(2, 'page2a'));
    expect(fake.last(GAMES_PATH).url.searchParams.get('page')).toBe('2');

    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(fake.to(GAMES_PATH)).toHaveLength(3);
    expect(fake.last(GAMES_PATH).url.searchParams.get('page')).toBe('1');
    // The filters did not change, so the last known total still holds while page 1 loads.
    expect(pageText()).toBe('Page 1 of 3');
    await fake.last(GAMES_PATH).respond(200, pageOf(1, 'page1b'));
    expect(pageText()).toBe('Page 1 of 3');
  });

  it('after a 503, Apply with no filter edit asks again from page 1 and a 200 clears the alert', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(200, pageOf(1, 'page1a'));
    await user.click(pagerButton('Next'));
    await fake.last(GAMES_PATH).respond(503);
    expect(screen.getByRole('alert').textContent).toBe('Database unavailable');

    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(fake.to(GAMES_PATH)).toHaveLength(3);
    expect(fake.last(GAMES_PATH).url.searchParams.get('page')).toBe('1');
    expect(screen.queryByRole('alert')).toBeNull();
    // The filters did not change, so the retry keeps the page count it knew.
    expect(pageText()).toBe('Page 1 of 3');
    await fake.last(GAMES_PATH).respond(200, pageOf(1, 'page1b'));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open match PAGE1B' })).not.toBeNull();
    expect(pageText()).toBe('Page 1 of 3');
  });

  it('after a 503 on page 1, Apply with no filter edit asks for page 1 again', async () => {
    // Page 1 is already the page, so only the Apply itself can make the request new.
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(503);
    expect(screen.getByRole('alert').textContent).toBe('Database unavailable');

    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(fake.to(GAMES_PATH)).toHaveLength(2);
    expect(fake.last(GAMES_PATH).url.searchParams.get('page')).toBe('1');
    await fake.last(GAMES_PATH).respond(200, pageOf(1, 'page1a'));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(pageText()).toBe('Page 1 of 3');
  });

  it('new filters forget the last known page count until their first page loads', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(200, pageOf(1, 'page1a'));
    await user.click(pagerButton('Next'));
    await fake.last(GAMES_PATH).respond(200, pageOf(2, 'page2a'));
    expect(pageText()).toBe('Page 2 of 3');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Opponents' }), 'humans');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    // Another filter set has another total, so the old "of 3" would be a guess.
    expect(pageText()).toBe('Page 1 of 1');
    await fake.last(GAMES_PATH).respond(200, makeGamesPage(itemsStartingWith('few', 10), { total: 10 }));
    expect(pageText()).toBe('Page 1 of 1');
    expect(pagerOff('Next')).toBe(true);
  });

  it('a slower page-2 response arriving after Apply requests page 1 is ignored', async () => {
    // The pager is disabled while a page loads, so two page requests of one filter set cannot
    // overlap. Apply stays enabled, and its page-1 request is the newer one here.
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(200, pageOf(1, 'page1a'));
    await user.click(pagerButton('Next'));
    const slowPage2 = fake.last(GAMES_PATH);
    expect(slowPage2.url.searchParams.get('page')).toBe('2');

    // Changing a filter makes Apply send new filters, which restarts at page 1.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Opponents' }), 'humans');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    const newPage1 = fake.last(GAMES_PATH);
    expect(newPage1).not.toBe(slowPage2);
    expect(newPage1.url.searchParams.get('page')).toBe('1');
    expect(newPage1.url.searchParams.get('bots')).toBe('humans');

    await newPage1.respond(200, pageOf(1, 'page1b'));
    expect(screen.getByRole('button', { name: 'Open match PAGE1B' })).not.toBeNull();

    await slowPage2.respond(200, pageOf(2, 'page2a'));
    expect(screen.queryByRole('button', { name: 'Open match PAGE2A' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Open match PAGE1B' })).not.toBeNull();
    expect(pageText()).toBe('Page 1 of 3');
  });

  it('a slower response for an older request never overwrites the page that replaced it', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    const slowPage1 = fake.last(GAMES_PATH);

    // Apply with new filters before the first answer: its request replaces the first.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Opponents' }), 'withBots');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(fake.to(GAMES_PATH)).toHaveLength(2);
    await fake.last(GAMES_PATH).respond(200, pageOf(1, 'newer'));
    await slowPage1.respond(200, pageOf(1, 'older'));

    expect(screen.getByRole('button', { name: 'Open match NEWER' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Open match OLDER' })).toBeNull();
  });

  it('clears the previous page while the next one loads and on error', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(200, pageOf(1, 'page1a'));
    expect(screen.getByRole('button', { name: 'Open match PAGE1A' })).not.toBeNull();

    await user.click(pagerButton('Next'));
    expect(screen.queryByRole('button', { name: 'Open match PAGE1A' })).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    // The next page is still on its way, so the pager cannot be pressed again.
    expect(pagerOff('Previous')).toBe(true);
    expect(pagerOff('Next')).toBe(true);

    await fake.last(GAMES_PATH).respond(503);
    expect(pageText()).toBe('Page 2 of 3');
    expect(screen.getByRole('alert').textContent).toBe('Database unavailable');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Open match / })).toBeNull();
    expect(screen.queryByText(/^Showing /)).toBeNull();
  });

  it('keeps Showing X of Y and exports the loaded page', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    const download = screen.getByRole<HTMLButtonElement>('button', { name: 'Download spreadsheet (this page)' });
    expect(download.disabled).toBe(true);
    expect(screen.queryByText(/^Showing /)).toBeNull();

    const page = pageOf(1, 'page1a');
    await fake.last(GAMES_PATH).respond(200, page);
    expect(screen.getByText('Showing 50 of 120')).not.toBeNull();
    expect(download.disabled).toBe(false);

    await user.click(download);
    expect(exportGamesList).toHaveBeenCalledTimes(1);
    expect(exportGamesList).toHaveBeenCalledWith(page.items);
    expect(page.items).toHaveLength(PAGE_SIZE);
  });

  it('shows the empty copy for zero matches', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(200, makeGamesPage([]));
    expect(screen.getByText('No finished matches match these filters.')).not.toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('Showing 0 of 0')).not.toBeNull();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Download spreadsheet (this page)' }).disabled).toBe(true);
    // An empty list is one page, never "Page 1 of 0".
    expect(pageText()).toBe('Page 1 of 1');
    expect(pagerOff('Previous')).toBe(true);
    expect(pagerOff('Next')).toBe(true);
  });

  it('puts the room code first and keeps the other columns in order', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(200, pageOf(1, 'page1a'));
    const table = within(screen.getByRole('region', { name: 'Matches' })).getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toStrictEqual([
      'Room code',
      'Ended',
      'Players',
      'Winner',
      'Winning kit',
      'Length',
      'Turns',
      'Notes',
    ]);
  });

  it('keeps the Ended date and time on one line so a phone does not break it over four', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(200, makeGamesPage([makeGameListItem('fg-1', { roomId: 'ABCDEF' })]));
    const table = within(screen.getByRole('region', { name: 'Matches' })).getByRole('table');
    const cells = within(table).getAllByRole('cell');
    expect(cells[1]?.textContent).toBe(formatDateTime('2026-10-20T12:30:00.000Z'));
    expect(cells[1]?.className).toContain('whitespace-nowrap');
    // Only the date column: the winner and notes text still wrap.
    expect(cells[3]?.className).not.toContain('whitespace-nowrap');
  });

  it('Tab reaches a row and Enter opens /admin/games/:id with the finished-game id, never roomId', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    const items = [makeGameListItem('fg-1', { roomId: 'ABCDEF' }), ...itemsStartingWith('fg-other', 3)];
    await fake.last(GAMES_PATH).respond(200, makeGamesPage(items));

    await tabTo(user, screen.getByRole('button', { name: 'Open match ABCDEF' }));
    await user.keyboard('{Enter}');

    expect(location.pathname).toBe('/admin/games/fg-1');
    expect(fake.to('/api/admin/games/fg-1')).toHaveLength(1);
    expect(fake.to('/api/admin/games/ABCDEF')).toHaveLength(0);
  });

  it('closing returns to /admin/games, does not reopen the URL detail, and puts focus back on the row', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    const items = [makeGameListItem('fg-1', { roomId: 'ABCDEF' }), ...itemsStartingWith('fg-other', 3)];
    await fake.last(GAMES_PATH).respond(200, makeGamesPage(items));

    const rowButton = screen.getByRole('button', { name: 'Open match ABCDEF' });
    await tabTo(user, rowButton);
    await user.keyboard('{Enter}');
    await fake.last('/api/admin/games/fg-1').respond(200, makeGameDetail({ id: 'fg-1', roomId: 'ABCDEF' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Match ABCDEF' })).not.toBeNull();

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));

    expect(location.pathname).toBe('/admin/games');
    expect(fake.to('/api/admin/games/fg-1')).toHaveLength(1);
    expect(document.activeElement).toBe(rowButton);
  });

  it('closing a deep-linked match returns to /admin/games and does not reopen it while the URL prop stays', async () => {
    // The shell only re-routes on popstate, which replaceState does not fire: after Close the
    // page is still handed detailId="fg-1" and must not open it again (`ignoreUrlDetail`).
    setAdminPath('/admin/games/fg-1');
    const fake = installFakeFetch();
    const { rerender, user } = renderUi(<AdminGamesPage password="secret" detailId="fg-1" />);
    expect(fake.to('/api/admin/games/fg-1')).toHaveLength(1);
    await fake.last(GAMES_PATH).respond(200, makeGamesPage([makeGameListItem('fg-1', { roomId: 'ABCDEF' })]));
    await fake.last('/api/admin/games/fg-1').respond(200, makeGameDetail({ id: 'fg-1', roomId: 'ABCDEF' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Match ABCDEF' })).not.toBeNull();

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(location.pathname).toBe('/admin/games');
    expect(fake.to('/api/admin/games/fg-1')).toHaveLength(1);

    // A parent re-render with the same URL-derived prop does not bring the dialog back.
    rerender(<AdminGamesPage password="secret" detailId="fg-1" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fake.to('/api/admin/games/fg-1')).toHaveLength(1);
    expect(location.pathname).toBe('/admin/games');
  });

  it('after a deep-linked match is closed, closing another match does not fall back to the URL match', async () => {
    // Without `ignoreUrlDetail`, a closed pick falls back to the URL prop and fetches it again.
    setAdminPath('/admin/games/fg-1');
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId="fg-1" />);
    await fake.last(GAMES_PATH).respond(
      200,
      makeGamesPage([makeGameListItem('fg-1', { roomId: 'ABCDEF' }), makeGameListItem('fg-2', { roomId: 'GHIJKL' })]),
    );
    await fake.last('/api/admin/games/fg-1').respond(200, makeGameDetail({ id: 'fg-1', roomId: 'ABCDEF' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    await user.click(screen.getByRole('button', { name: 'Open match GHIJKL' }));
    expect(location.pathname).toBe('/admin/games/fg-2');
    await fake.last('/api/admin/games/fg-2').respond(200, makeGameDetail({ id: 'fg-2', roomId: 'GHIJKL' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    expect(location.pathname).toBe('/admin/games');
    expect(fake.to('/api/admin/games/fg-1')).toHaveLength(1);
    expect(fake.to('/api/admin/games/fg-2')).toHaveLength(1);
  });

  it('a deep link to /admin/games/:id shows Loading… then the dialog', async () => {
    setAdminPath('/admin/games/fg-1');
    const fake = installFakeFetch();
    renderUi(<AdminGamesPage password="secret" detailId="fg-1" />);
    await fake.last(GAMES_PATH).respond(200, makeGamesPage([makeGameListItem('fg-1', { roomId: 'ABCDEF' })]));

    // The list is in, the detail is still on its way: one Loading… line, no dialog yet.
    expect(fake.to('/api/admin/games/fg-1')).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    expect(screen.queryByRole('dialog')).toBeNull();

    await fake.last('/api/admin/games/fg-1').respond(200, makeGameDetail({ id: 'fg-1', roomId: 'ABCDEF' }));
    expect(screen.queryByRole('status')).toBeNull();
    const dialog = screen.getByRole('dialog', { name: 'Match ABCDEF' });
    expect(dialog.getAttribute('data-mode')).toBe('tool');
  });

  it('an older detail response arriving after a newer one is ignored', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(
      200,
      makeGamesPage([makeGameListItem('fg-a', { roomId: 'AAAAAA' }), makeGameListItem('fg-b', { roomId: 'BBBBBB' })]),
    );

    // Nothing is open while a detail loads, so a second row can be picked before the first answers.
    await user.click(screen.getByRole('button', { name: 'Open match AAAAAA' }));
    const older = fake.last('/api/admin/games/fg-a');
    await user.click(screen.getByRole('button', { name: 'Open match BBBBBB' }));
    const newer = fake.last('/api/admin/games/fg-b');
    expect(location.pathname).toBe('/admin/games/fg-b');

    await newer.respond(200, makeGameDetail({ id: 'fg-b', roomId: 'BBBBBB' }));
    await older.respond(200, makeGameDetail({ id: 'fg-a', roomId: 'AAAAAA' }));

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Match BBBBBB' })).not.toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Match AAAAAA' })).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('an older detail response arriving while a newer one is pending shows neither', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(
      200,
      makeGamesPage([makeGameListItem('fg-a', { roomId: 'AAAAAA' }), makeGameListItem('fg-b', { roomId: 'BBBBBB' })]),
    );
    await user.click(screen.getByRole('button', { name: 'Open match AAAAAA' }));
    const older = fake.last('/api/admin/games/fg-a');
    await user.click(screen.getByRole('button', { name: 'Open match BBBBBB' }));

    await older.respond(503);
    // The failure belongs to the match that is no longer open: no alert, and B is still loading.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Loading…');
  });

  it.each([
    [404, 'Not found'],
    [503, 'Database unavailable'],
  ])('%i shows %s, with the dialog closed', async (status, copy) => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(200, makeGamesPage([makeGameListItem('fg-1', { roomId: 'ABCDEF' })]));
    await user.click(screen.getByRole('button', { name: 'Open match ABCDEF' }));
    expect(screen.getByRole('status').textContent).toBe('Loading…');

    await fake.last('/api/admin/games/fg-1').respond(status);
    expect(screen.getByRole('alert').textContent).toBe(copy);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('picking the same match again after a failure asks again and opens it', async () => {
    // `activeDetail` does not change on a retry, so the page must ask again on its own.
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(200, makeGamesPage([makeGameListItem('fg-1', { roomId: 'ABCDEF' })]));
    await user.click(screen.getByRole('button', { name: 'Open match ABCDEF' }));
    await fake.last('/api/admin/games/fg-1').respond(503);
    expect(screen.getByRole('alert').textContent).toBe('Database unavailable');

    await user.click(screen.getByRole('button', { name: 'Open match ABCDEF' }));
    expect(fake.to('/api/admin/games/fg-1')).toHaveLength(2);
    // The old alert is gone the moment the retry starts.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Loading…');

    await fake.last('/api/admin/games/fg-1').respond(200, makeGameDetail({ id: 'fg-1', roomId: 'ABCDEF' }));
    expect(screen.getByRole('dialog', { name: 'Match ABCDEF' })).not.toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it.each(['Escape', 'Close'])('%s returns to /admin/games', async (how) => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(200, makeGamesPage([makeGameListItem('fg-1', { roomId: 'ABCDEF' })]));
    await user.click(screen.getByRole('button', { name: 'Open match ABCDEF' }));
    await fake.last('/api/admin/games/fg-1').respond(200, makeGameDetail({ id: 'fg-1', roomId: 'ABCDEF' }));
    expect(location.pathname).toBe('/admin/games/fg-1');

    if (how === 'Escape') {
      await user.keyboard('{Escape}');
    } else {
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    }

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(location.pathname).toBe('/admin/games');
    expect(fake.to('/api/admin/games/fg-1')).toHaveLength(1);
  });

  it('a mouse click on a row opens that match too', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminGamesPage password="secret" detailId={null} />);
    await fake.last(GAMES_PATH).respond(200, makeGamesPage([makeGameListItem('fg-9', { winnerNickname: 'Ana' })]));

    await user.click(screen.getByText('Ana'));
    expect(location.pathname).toBe('/admin/games/fg-9');
    expect(fake.to('/api/admin/games/fg-9')).toHaveLength(1);
  });
});
