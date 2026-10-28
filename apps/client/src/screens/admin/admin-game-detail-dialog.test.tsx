// @vitest-environment happy-dom
import type { AdminGameDetail } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDateTime } from '../../admin/admin-present';
import {
  buildActionLogWorkbook,
  downloadWorkbookBuffer,
} from '../../export/build-action-log-xlsx';
import { renderUi } from '../../test/render';
import { AdminGameDetailDialog } from './admin-game-detail-dialog';
import { makeGameDetail } from './admin-fixtures';

// No test writes a file: the dialog only has to hand the log to the builder and the buffer to
// the downloader.
vi.mock('../../export/build-action-log-xlsx', () => ({
  buildActionLogWorkbook: vi.fn(),
  downloadWorkbookBuffer: vi.fn(),
}));
const buildWorkbook = vi.mocked(buildActionLogWorkbook);
const saveWorkbook = vi.mocked(downloadWorkbookBuffer);

afterEach(() => {
  buildWorkbook.mockReset();
  saveWorkbook.mockReset();
});

const noop = (): void => undefined;

/** Ann won with 7 lives and 12 points; Bob went out in combat to Ann. The match had bots. */
function detailOf(overrides: Partial<AdminGameDetail> = {}): AdminGameDetail {
  return makeGameDetail({
    hasBots: true,
    winnerPlayerId: 'p1',
    winnerNickname: 'Ann',
    seats: [
      {
        playerId: 'p1',
        seatIndex: 0,
        nickname: 'Ann',
        kitId: 'scientific',
        lives: 7,
        points: 12,
        isWinner: true,
        isEliminated: false,
        isBot: false,
      },
      {
        playerId: 'p2',
        seatIndex: 1,
        nickname: 'Bob',
        kitId: 'assassin',
        lives: 0,
        points: 3,
        isWinner: false,
        isEliminated: true,
        isBot: false,
      },
    ],
    eliminations: [
      { orderIndex: 0, playerId: 'p2', nickname: 'Bob', eliminatorPlayerId: 'p1', reason: 'combat' },
    ],
    ...overrides,
  });
}

/** The value paired with a `dt` of the match facts. */
function fact(label: string): string {
  const term = within(screen.getByRole('dialog')).getByText(label, { selector: 'dt' });
  const value = term.nextElementSibling;
  if (value === null) throw new Error(`no value after ${label}`);
  return value.textContent;
}

/** Body rows of a labelled table as arrays of cell text. */
function rowsOf(label: string): string[][] {
  const region = within(screen.getByRole('dialog')).getByRole('region', { name: label });
  return within(region)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent));
}

function deferredBuild(): { resolve: (buffer: ArrayBuffer) => void; reject: () => void } {
  let resolve: (buffer: ArrayBuffer) => void = noop;
  let reject: () => void = noop;
  buildWorkbook.mockReturnValue(
    new Promise<ArrayBuffer>((onResolve, onReject) => {
      resolve = onResolve;
      reject = () => {
        onReject(new Error('build failed'));
      };
    }),
  );
  return { resolve: (buffer) => { resolve(buffer); }, reject: () => { reject(); } };
}

describe('AdminGameDetailDialog (technical spec v7 §7.8, L80-07)', () => {
  it('renders nothing while there is no detail', () => {
    renderUi(<AdminGameDetailDialog detail={null} onClose={noop} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows Started, Ended, Mode, Length, Turns, Winner, the notes and the seed', () => {
    renderUi(<AdminGameDetailDialog detail={detailOf()} onClose={noop} />);
    const dialog = screen.getByRole('dialog', { name: 'Match ABCDEF' });
    expect(
      within(dialog)
        .getAllByRole('term')
        .map((term) => term.textContent),
    ).toStrictEqual(['Started', 'Ended', 'Mode', 'Length', 'Turns', 'Winner', 'Notes']);
    expect(fact('Started')).toBe(formatDateTime('2026-10-20T12:20:00.000Z'));
    expect(fact('Ended')).toBe(formatDateTime('2026-10-20T12:30:00.000Z'));
    expect(fact('Mode')).toBe('Classic');
    expect(fact('Length')).toBe('10.0 min');
    expect(fact('Turns')).toBe('12');
    expect(fact('Winner')).toBe('Ann');
    expect(fact('Notes')).toBe('Bots');
    expect(within(dialog).getByText(/^Replay seed/).textContent).toBe('Replay seed (designer only): seed-1');
  });

  it('writes Bots · Tutorial, or — when there is no flag', () => {
    const { rerender } = renderUi(
      <AdminGameDetailDialog detail={detailOf({ hasBots: true, isTutorial: true })} onClose={noop} />,
    );
    expect(fact('Notes')).toBe('Bots · Tutorial');
    rerender(<AdminGameDetailDialog detail={detailOf({ hasBots: false, isTutorial: false })} onClose={noop} />);
    expect(fact('Notes')).toBe('—');
  });

  it('lists seats with Points and the Winner > Bot > Eliminated > Player role', () => {
    const base = detailOf();
    const [ann, bob] = base.seats;
    if (ann === undefined || bob === undefined) throw new Error('fixture seats');
    renderUi(
      <AdminGameDetailDialog
        detail={detailOf({
          seats: [
            ann,
            // A winning bot is a Winner; an eliminated bot is a Bot; then Eliminated; then Player.
            { ...ann, playerId: 'p3', nickname: 'Robo', isBot: true, lives: 5, points: 4 },
            { ...bob, playerId: 'p4', nickname: 'Bolt', isWinner: false, isBot: true, isEliminated: true },
            bob,
            { ...ann, playerId: 'p5', nickname: 'Cat', isWinner: false, lives: 2, points: 0 },
          ],
        })}
        onClose={noop}
      />,
    );
    const region = within(screen.getByRole('dialog')).getByRole('region', { name: 'Seats' });
    expect(
      within(region)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toStrictEqual(['Player', 'Kit', 'Lives', 'Points', 'Role']);
    expect(rowsOf('Seats')).toStrictEqual([
      ['Ann', 'Scientific', '7', '12', 'Winner'],
      ['Robo', 'Scientific', '5', '4', 'Winner'],
      ['Bolt', 'Assassin', '0', '3', 'Bot'],
      ['Bob', 'Assassin', '0', '3', 'Eliminated'],
      ['Cat', 'Scientific', '2', '0', 'Player'],
    ]);
  });

  it('each elimination shows the victim, the reason and the eliminator', () => {
    renderUi(
      <AdminGameDetailDialog
        detail={detailOf({
          eliminations: [
            { orderIndex: 0, playerId: 'p2', nickname: 'Bob', eliminatorPlayerId: 'p1', reason: 'combat' },
            // No eliminator, and one that resolves to no seat: neither adds " · by".
            { orderIndex: 1, playerId: 'p3', nickname: 'Cat', eliminatorPlayerId: null, reason: 'absence' },
            { orderIndex: 2, playerId: 'p4', nickname: 'Dan', eliminatorPlayerId: 'p-gone', reason: 'leave' },
          ],
        })}
        onClose={noop}
      />,
    );
    const heading = screen.getByRole('heading', { name: 'Elimination order' });
    const list = heading.nextElementSibling;
    if (list === null) throw new Error('no elimination list');
    expect(
      within(list as HTMLElement)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toStrictEqual(['Bob — Combat · by Ann', 'Cat — Absent', 'Dan — Left']);
  });

  it('leaves out Elimination order when nobody was eliminated', () => {
    renderUi(<AdminGameDetailDialog detail={detailOf({ eliminations: [] })} onClose={noop} />);
    expect(screen.queryByRole('heading', { name: 'Elimination order' })).toBeNull();
  });

  it('shows Unknown for a null winner and — for a missing nickname', () => {
    const base = detailOf();
    renderUi(
      <AdminGameDetailDialog
        detail={detailOf({
          winnerNickname: null,
          seats: base.seats.map((seat) => (seat.playerId === 'p2' ? { ...seat, nickname: null } : seat)),
          eliminations: [
            { orderIndex: 0, playerId: 'p2', nickname: null, eliminatorPlayerId: 'p1', reason: 'combat' },
          ],
        })}
        onClose={noop}
      />,
    );
    expect(fact('Winner')).toBe('Unknown');
    expect(rowsOf('Seats')[1]?.[0]).toBe('—');
    expect(screen.getByText('Unknown — Combat · by Ann')).not.toBeNull();
  });

  it('the panel is in tool mode', () => {
    renderUi(<AdminGameDetailDialog detail={detailOf()} onClose={noop} />);
    expect(screen.getByRole('dialog').getAttribute('data-mode')).toBe('tool');
  });

  it('Close and Esc ask to close, and the footer has no Download without a log', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<AdminGameDetailDialog detail={detailOf()} onClose={onClose} />);
    expect(screen.queryByRole('button', { name: 'Download action log' })).toBeNull();

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('Download action log shows Downloading… and downloads once', async () => {
    const build = deferredBuild();
    const { user } = renderUi(
      <AdminGameDetailDialog
        detail={detailOf({ hasExportLog: true, exportLog: { turns: [], events: [] } })}
        onClose={noop}
      />,
    );
    const button = screen.getByRole('button', { name: 'Download action log' });

    await user.click(button);
    await user.click(button);
    expect(buildWorkbook).toHaveBeenCalledTimes(1);
    expect(buildWorkbook).toHaveBeenCalledWith({ turns: [], events: [] });
    // Busy keeps focus on the button (aria-disabled, never native disabled), so a keyboard user
    // is not dropped out of the dialog.
    const busy = screen.getByRole('button', { name: 'Downloading…' });
    expect(busy).toBe(button);
    expect(busy.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(busy);
    expect(saveWorkbook).not.toHaveBeenCalled();

    const buffer = new ArrayBuffer(8);
    build.resolve(buffer);
    await waitFor(() => {
      expect(saveWorkbook).toHaveBeenCalledTimes(1);
    });
    expect(saveWorkbook).toHaveBeenCalledWith(buffer, 'ABCDEF.xlsx');
    expect(screen.getByRole('button', { name: 'Download action log' }).getAttribute('aria-disabled')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a build failure shows an alert', async () => {
    const build = deferredBuild();
    const { user } = renderUi(
      <AdminGameDetailDialog
        detail={detailOf({ hasExportLog: true, exportLog: { turns: [], events: [] } })}
        onClose={noop}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Download action log' }));
    build.reject();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Could not build the action log.');
    expect(saveWorkbook).not.toHaveBeenCalled();
    // The button is usable again, and a second try clears the alert while it builds.
    const retry = screen.getByRole('button', { name: 'Download action log' });
    expect(retry.getAttribute('aria-disabled')).toBeNull();
    const second = deferredBuild();
    await user.click(retry);
    expect(screen.queryByRole('alert')).toBeNull();
    second.resolve(new ArrayBuffer(1));
    await waitFor(() => {
      expect(saveWorkbook).toHaveBeenCalledTimes(1);
    });
  });
});
