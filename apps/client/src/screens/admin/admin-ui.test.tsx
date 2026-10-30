// @vitest-environment happy-dom
import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminPageCount } from '../../admin/admin-paging';
import { renderUi } from '../../test/render';
import {
  AdminDataTable,
  AdminMetricCard,
  AdminMetricGrid,
  AdminPager,
  AdminStatus,
  AdminToggleChip,
  type AdminTableColumn,
} from './admin-ui';

interface KitRow {
  kit: string;
  picks: number;
}

/**
 * The pager buttons are `focusableWhenDisabled`: off is `aria-disabled`, never native `disabled`
 * (frontend.md "Disabled but focusable", WCAG 2.4.3). happy-dom keeps focus on a natively
 * disabled button where Chrome drops it to the body, so the missing `disabled` attribute is what
 * pins the fix here; the `activeElement` checks state the intent.
 */
function isOff(button: HTMLElement): boolean {
  expect(button.hasAttribute('disabled')).toBe(false);
  return button.getAttribute('aria-disabled') === 'true';
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

describe('AdminDataTable wide tables on a phone (technical spec v7 §7.8, L80-12)', () => {
  it('a nowrap column keeps its cells on one line and the others wrap', () => {
    const dated: readonly AdminTableColumn<KitRow>[] = [
      { id: 'kit', header: 'Kit', cell: (row) => row.kit },
      { id: 'when', header: 'Ended', nowrap: true, cell: () => 'Oct 20, 2026, 2:30 PM' },
    ];
    renderUi(<AdminDataTable label="Kit stats" columns={dated} rows={[{ kit: 'Spy', picks: 2 }]} rowKey={(row) => row.kit} />);
    const [kit, when] = within(screen.getByRole('table')).getAllByRole('cell');
    expect(when?.className).toContain('whitespace-nowrap');
    expect(kit?.className).not.toContain('whitespace-nowrap');
  });
});

/** The layout happy-dom does not compute: a region 300 wide that holds a table 900 wide. */
interface ScrollBox {
  scrollWidth: number;
  clientWidth: number;
  scrollLeft: number;
}

const WIDE: ScrollBox = { scrollWidth: 900, clientWidth: 300, scrollLeft: 0 };

/** happy-dom's ResizeObserver never fires, so a test fires it by hand (precedent: chat-log.test.tsx). */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observe = vi.fn<(target: Element) => void>();
  readonly unobserve = vi.fn<(target: Element) => void>();
  readonly disconnect = vi.fn<() => void>();
  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  resize(): void {
    act(() => {
      this.callback([], this);
    });
  }
}

/** The fade cue of a table region: the element next to the scroll region, if shown. */
function scrollCue(): Element | null {
  return screen.getByRole('region', { name: 'Kit stats' }).parentElement?.querySelector('[data-scroll-cue]') ?? null;
}

/** Stubs the box on the region itself, after the first render, as the browser would report it. */
function stubRegion(box: ScrollBox): HTMLElement {
  const region = screen.getByRole('region', { name: 'Kit stats' });
  Object.defineProperties(region, {
    scrollWidth: { configurable: true, get: () => box.scrollWidth },
    clientWidth: { configurable: true, get: () => box.clientWidth },
    scrollLeft: { configurable: true, get: () => box.scrollLeft },
  });
  return region;
}

function renderTable(): void {
  renderUi(
    <AdminDataTable label="Kit stats" columns={columns} rows={[{ kit: 'Spy', picks: 2 }]} rowKey={(row) => row.kit} />,
  );
}

describe('AdminDataTable scroll cue (technical spec v7 §7.8, L80-12)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    FakeResizeObserver.instances = [];
  });

  it('shows a decorative right-edge fade when the table overflows at mount', () => {
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(WIDE.scrollWidth);
    // happy-dom defines `clientWidth` on HTMLElement and `scrollWidth` on Element.
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(WIDE.clientWidth);
    renderTable();
    const cue = scrollCue();
    if (cue === null) throw new Error('the overflowing table shows no cue');
    // Not announced, not clickable, and a fade into the panel color on the right edge.
    expect(cue.getAttribute('aria-hidden')).toBe('true');
    expect(cue.className).toContain('pointer-events-none');
    expect(cue.className).toContain('right-0');
    expect(cue.className).toContain('bg-linear-to-l');
    expect(cue.className).toContain('from-v7-panel');
  });

  it('shows no cue when the table fits', () => {
    renderTable();
    expect(scrollCue()).toBeNull();
    const region = stubRegion({ scrollWidth: 300, clientWidth: 300, scrollLeft: 0 });
    fireEvent.scroll(region);
    expect(scrollCue()).toBeNull();
  });

  it('follows the scroll position: shown until the end, gone at the end, back when scrolled back', () => {
    renderTable();
    const box = { ...WIDE };
    const region = stubRegion(box);
    expect(scrollCue()).toBeNull();

    fireEvent.scroll(region);
    expect(scrollCue()).not.toBeNull();

    box.scrollLeft = 250;
    fireEvent.scroll(region);
    expect(scrollCue()).not.toBeNull();

    box.scrollLeft = 600;
    fireEvent.scroll(region);
    expect(scrollCue()).toBeNull();

    box.scrollLeft = 0;
    fireEvent.scroll(region);
    expect(scrollCue()).not.toBeNull();
  });

  it('follows a resize of the region or of the table through its ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    renderTable();
    const [observer] = FakeResizeObserver.instances;
    if (observer === undefined) throw new Error('the table did not observe its size');
    const region = screen.getByRole('region', { name: 'Kit stats' });
    // Both the scroll region (the window narrows) and the table (new rows) can change the overflow.
    expect(observer.observe).toHaveBeenCalledWith(region);
    expect(observer.observe).toHaveBeenCalledWith(within(region).getByRole('table'));

    const box = { ...WIDE };
    stubRegion(box);
    observer.resize();
    expect(scrollCue()).not.toBeNull();

    box.clientWidth = 900;
    observer.resize();
    expect(scrollCue()).toBeNull();
  });

  it('stops listening when the table unmounts', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const { unmount } = renderUi(
      <AdminDataTable label="Kit stats" columns={columns} rows={[{ kit: 'Spy', picks: 2 }]} rowKey={(row) => row.kit} />,
    );
    const [observer] = FakeResizeObserver.instances;
    if (observer === undefined) throw new Error('the table did not observe its size');
    unmount();
    expect(observer.disconnect).toHaveBeenCalled();
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
    expect(isOff(previous)).toBe(true);
    expect(isOff(next)).toBe(false);

    // An off end-stop swallows the press.
    await user.click(previous);
    expect(onPage).not.toHaveBeenCalled();
    await user.click(next);
    expect(onPage).toHaveBeenLastCalledWith(2);

    rerender(<AdminPager page={2} pageCount={3} onPage={onPage} />);
    expect(within(nav).getByText('Page 2 of 3')).not.toBeNull();
    expect(isOff(previous)).toBe(false);
    expect(isOff(next)).toBe(false);
    await user.click(previous);
    expect(onPage).toHaveBeenLastCalledWith(1);

    rerender(<AdminPager page={3} pageCount={3} onPage={onPage} />);
    expect(within(nav).getByText('Page 3 of 3')).not.toBeNull();
    expect(isOff(previous)).toBe(false);
    expect(isOff(next)).toBe(true);
    await user.click(next);
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
    expect(isOff(screen.getByRole('button', { name: 'Previous' }))).toBe(true);
    expect(isOff(screen.getByRole('button', { name: 'Next' }))).toBe(true);
  });

  it('disabled turns both buttons off while a page loads', async () => {
    const onPage = vi.fn<(page: number) => void>();
    const { user } = renderUi(<AdminPager page={2} pageCount={3} onPage={onPage} disabled />);
    expect(isOff(screen.getByRole('button', { name: 'Previous' }))).toBe(true);
    expect(isOff(screen.getByRole('button', { name: 'Next' }))).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPage).not.toHaveBeenCalled();
  });

  it('a button turned off by its own keyboard press keeps focus', async () => {
    // Next on page 2 of 3: the parent turns the pager off while page 3 loads, then Next stays
    // off on the last page. Native `disabled` would drop focus to the body both times.
    const onPage = vi.fn<(page: number) => void>();
    const { rerender, user } = renderUi(<AdminPager page={2} pageCount={3} onPage={onPage} />);
    const next = screen.getByRole('button', { name: 'Next' });
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(next);
    await user.keyboard('{Enter}');
    expect(onPage).toHaveBeenLastCalledWith(3);

    rerender(<AdminPager page={3} pageCount={3} onPage={onPage} disabled />);
    expect(isOff(next)).toBe(true);
    expect(document.activeElement).toBe(next);
    rerender(<AdminPager page={3} pageCount={3} onPage={onPage} />);
    expect(isOff(next)).toBe(true);
    expect(document.activeElement).toBe(next);
    await user.keyboard('{Enter}');
    expect(onPage).toHaveBeenCalledTimes(1);
  });
});

describe('AdminToggleChip (technical spec v7 §7.8, L80-09)', () => {
  it('AdminToggleChip exposes aria-pressed and an icon-only chip keeps its name', async () => {
    const onAll = vi.fn<() => void>();
    const onPending = vi.fn<() => void>();
    const { rerender, user } = renderUi(
      <>
        <AdminToggleChip label="All" pressed onPress={onAll} />
        <AdminToggleChip
          label="Pending"
          pressed={false}
          onPress={onPending}
          icon={<svg data-testid="glyph" aria-hidden="true" />}
          labelHidden
        />
      </>,
    );
    const all = screen.getByRole('button', { name: 'All' });
    expect(all.getAttribute('aria-pressed')).toBe('true');
    expect(all.textContent).toBe('All');
    // A text chip is named by its words: no title or aria-label repeats them.
    expect(all.hasAttribute('title')).toBe(false);
    expect(all.hasAttribute('aria-label')).toBe(false);

    // The icon-only chip has no words on screen, so its name and tooltip come from the label.
    const pending = screen.getByRole('button', { name: 'Pending' });
    expect(pending.getAttribute('aria-pressed')).toBe('false');
    expect(pending.getAttribute('aria-label')).toBe('Pending');
    expect(pending.getAttribute('title')).toBe('Pending');
    expect(pending.textContent).toBe('');
    expect(within(pending).getByTestId('glyph')).not.toBeNull();

    await user.click(pending);
    expect(onPending).toHaveBeenCalledTimes(1);
    await user.click(all);
    expect(onAll).toHaveBeenCalledTimes(1);

    // Pressed and idle differ in the fill, not only in the attribute.
    expect(all.className).toContain('bg-v7-cta-2');
    expect(pending.className).toContain('bg-v7-panel-2');
    rerender(
      <>
        <AdminToggleChip label="All" pressed={false} onPress={onAll} />
        <AdminToggleChip label="Pending" pressed onPress={onPending} icon={<svg aria-hidden="true" />} labelHidden />
      </>,
    );
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Pending' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('a chip with an icon and no hidden label shows both', () => {
    renderUi(<AdminToggleChip label="Done" pressed={false} onPress={vi.fn()} icon={<svg data-testid="glyph" aria-hidden="true" />} />);
    const chip = screen.getByRole('button', { name: 'Done' });
    expect(chip.textContent).toBe('Done');
    expect(within(chip).getByTestId('glyph')).not.toBeNull();
    expect(chip.hasAttribute('title')).toBe(false);
  });
});

describe('AdminMetricCard (technical spec v7 §12.4, L80-12)', () => {
  it('keeps the term and value markup and paints a fill, never an outline, inside its panel', () => {
    renderUi(
      <AdminMetricGrid>
        <AdminMetricCard label="Humans only" value="12" hint="No bot seats" />
        <AdminMetricCard label="Finished matches" value="30" />
      </AdminMetricGrid>,
    );
    const term = screen.getByText('Humans only');
    expect(term.tagName).toBe('DT');
    const cell = term.parentElement;
    if (cell === null) throw new Error('The metric term has no cell');
    expect(cell.parentElement?.tagName).toBe('DL');
    // The value and the hint are two `dd` of the same term (a `p` is not allowed in a `dl`).
    expect([...cell.querySelectorAll('dd')].map((value) => value.textContent)).toStrictEqual([
      '12',
      'No bot seats',
    ]);
    expect(screen.getByText('30').tagName).toBe('DD');
    // A metric sits inside an outlined module panel: its own border or shadow would read as a
    // card inside a card (Impeccable `nested-cards`), so it is a `--panel-2` fill only.
    expect(cell.className).toContain('bg-v7-panel-2');
    expect(cell.className).not.toMatch(/border|shadow|outline/);
  });
});
