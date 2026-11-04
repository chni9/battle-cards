// @vitest-environment happy-dom
/**
 * App wiring of the lobby over a mocked room connection (technical spec v7 §4.1: the hook's API is
 * unchanged). L76-14: the reject alert's dismiss and the phase-change clear (§7.2, Q26/Q29; A.9
 * ruling 7; Review Focus 3). L76-16: the claim picker wiring (§7.7, §7.2, Q24; Appendix A
 * `claim-seat-dismiss-stay`).
 */
import { ACTION_REJECT_MESSAGE, type ClaimableSeatView, type LobbySeatView, type StateView } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import type { ActionRejectPayload, UseRoomConnectionResult } from './net/use-room-connection';
import { guestLobbyView, hostLobbyView, LOBBY_BOT, LOBBY_GUEST, LOBBY_HOST, walkInLobbyView } from './screens/lobby/test-lobby';
import { fakeRoomConnection } from './test/fake-room-connection';
import { renderUi, type RenderUiResult } from './test/render';
import { HOW_TO_PLAY_SEEN_KEY } from './ui/help-storage';
import { markLatestReleaseSeen } from './ui/release-storage';
import { makePlayingView } from './view-model/test-fixtures';

const fake = vi.hoisted(() => {
  const state: { connection: UseRoomConnectionResult | null } = { connection: null };
  return state;
});

vi.mock('./net/use-room-connection', () => ({
  useRoomConnection: (): UseRoomConnectionResult => {
    if (fake.connection === null) throw new Error('no fake connection');
    return fake.connection;
  },
}));

/**
 * `ui-switch.ts`'s key, written out: until L75-09 flips the default, a stored `next` keeps the playing
 * branch on the arena (as `App.arena.test.tsx` does). L75-09 deletes that module and clears the key.
 */
const ARENA_SWITCH_KEY = 'card-battle.v7.ui';
const NOT_READY: ActionRejectPayload = { code: 'start-not-all-ready', message: ACTION_REJECT_MESSAGE['start-not-all-ready'] };
const KICKED: ActionRejectPayload = { code: 'kicked', message: ACTION_REJECT_MESSAGE.kicked };

function renderApp(connection: UseRoomConnectionResult): RenderUiResult {
  fake.connection = connection;
  return renderUi(<App />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
}
function show(result: RenderUiResult, connection: UseRoomConnectionResult): void {
  fake.connection = connection;
  result.rerender(<App />);
}
/** A connection that holds a reject, on a lobby or a table view. */
function rejected(view: StateView | null, clearActionReject: () => void): UseRoomConnectionResult {
  return fakeRoomConnection(view, { error: NOT_READY.message, actionReject: NOT_READY, clearActionReject });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(ARENA_SWITCH_KEY, 'next');
  markLatestReleaseSeen(); // Home would open What's new over its status block on mount
  vi.useFakeTimers();
});

describe('App lobby rejects (§7.2, Q26/Q29, A.9 ruling 7, L76-14)', () => {
  it("hands clearActionReject to the lobby alert's OK, which calls it once", async () => {
    const clearActionReject = vi.fn<() => void>();
    const { user } = renderApp(rejected(hostLobbyView(), clearActionReject));
    const alert = document.querySelector<HTMLElement>('[data-lobby-alert]');
    if (alert === null) throw new Error('no lobby alert');
    expect(within(alert).getByRole('alert').textContent).toBe(NOT_READY.message);
    await user.click(within(alert).getByRole('button', { name: 'OK' }));
    expect(clearActionReject).toHaveBeenCalledTimes(1);
  });

  it('clears a stored reject once when the room goes from the lobby to the table, never on a same-phase update', () => {
    const clearActionReject = vi.fn<() => void>();
    const result = renderApp(rejected(hostLobbyView(), clearActionReject));
    show(result, rejected(hostLobbyView({ chatMessages: [] }), clearActionReject)); // a lobby update
    expect(clearActionReject).not.toHaveBeenCalled();
    const table = makePlayingView();
    show(result, rejected(table, clearActionReject));
    expect(clearActionReject).toHaveBeenCalledTimes(1);
    show(result, rejected({ ...table, turnSequence: 2 }, clearActionReject)); // a table update
    expect(clearActionReject).toHaveBeenCalledTimes(1);
  });

  it("keeps a kicked guest's message on Home: a lobby that ends with no room never clears it (Review Focus 3)", () => {
    const clearActionReject = vi.fn<() => void>();
    const result = renderApp(fakeRoomConnection(guestLobbyView(), { clearActionReject }));
    show(result, fakeRoomConnection(null, { status: 'disconnected', error: KICKED.message, actionReject: KICKED, clearActionReject }));
    expect(clearActionReject).not.toHaveBeenCalled();
    expect(screen.getByText(KICKED.message).closest('[role="alert"]')).not.toBeNull();
  });
});

describe('App claim picker wiring (§7.7, §7.2, Q24, L57-15, L76-16)', () => {
  const picker = (): HTMLElement | null => screen.queryByRole('dialog', { name: 'Sit as a disconnected player?' });
  /** A reserved human seat whose player dropped: the lobby lists it as claimable. */
  const DEE: LobbySeatView = { id: 'dee', nickname: 'Dee', isBot: false, isReady: false };
  const DEE_FREE: readonly ClaimableSeatView[] = [{ playerId: 'dee', nickname: 'Dee' }];
  const seats = [LOBBY_HOST, LOBBY_GUEST, LOBBY_BOT, DEE];

  it('shows no picker to a seated living player during play, so Draw stays reachable (L57-15)', () => {
    renderApp(fakeRoomConnection(makePlayingView({ claimableSeats: [{ playerId: 'p1', nickname: 'p1' }] })));
    expect(picker()).toBeNull();
    expect(within(document.querySelector<HTMLElement>('[data-arena-region="dock"]') ?? document.body).getByRole('button', { name: /^Draw, plus / })).toBeDefined();
  });

  it('a lobby walk-in: Stay sends staySpectating once and hides the picker for that set, Claim a seat reopens it, Esc is Stay, and an empty set leaves no control (ruling 9)', async () => {
    const staySpectating = vi.fn<() => void>();
    const walkIn = (claimableSeats: readonly ClaimableSeatView[]) =>
      fakeRoomConnection(walkInLobbyView({ players: seats, claimableSeats }), { staySpectating });
    const result = renderApp(walkIn(DEE_FREE));
    const open = picker();
    if (open === null) throw new Error('the claim picker did not open');
    await result.user.click(within(open).getByRole('button', { name: 'Stay spectating' }));
    expect(staySpectating).toHaveBeenCalledTimes(1);
    await waitFor(() => { expect(picker()).toBeNull(); });
    show(result, walkIn(DEE_FREE)); // a new view, the same set: still hidden
    expect(picker()).toBeNull();
    await result.user.click(screen.getByRole('button', { name: 'Claim a seat' }));
    expect(picker()).not.toBeNull();
    expect(staySpectating).toHaveBeenCalledTimes(1);
    await result.user.keyboard('{Escape}');
    expect(staySpectating).toHaveBeenCalledTimes(2);
    await waitFor(() => { expect(picker()).toBeNull(); });
    show(result, walkIn([]));
    expect(screen.queryByRole('button', { name: 'Claim a seat' })).toBeNull();
    expect(picker()).toBeNull();
  });

  it("a seated non-host lobby guest's Keep this seat sends nothing and hides the picker; no Claim a seat (L57-16)", async () => {
    const staySpectating = vi.fn<() => void>();
    const { user } = renderApp(fakeRoomConnection(guestLobbyView({ players: seats, claimableSeats: DEE_FREE }), { staySpectating }));
    const open = picker();
    if (open === null) throw new Error('the claim picker did not open');
    await user.click(within(open).getByRole('button', { name: 'Keep this seat' }));
    await waitFor(() => { expect(picker()).toBeNull(); });
    expect(staySpectating).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Claim a seat' })).toBeNull();
  });

  it('never shows the picker to the lobby host (L57-15)', () => {
    renderApp(fakeRoomConnection(hostLobbyView({ players: seats, claimableSeats: DEE_FREE })));
    expect(picker()).toBeNull();
  });
});

describe('App invite link (§7.1, §7.2, L76-17; Part 2 Review Focus 4)', () => {
  const title = (): string => screen.getByRole('heading', { level: 1 }).textContent;
  const codeField = (): HTMLInputElement => screen.getByRole<HTMLInputElement>('textbox', { name: 'Game code' });
  const home = (extra: Partial<UseRoomConnectionResult> = {}): UseRoomConnectionResult =>
    fakeRoomConnection(null, { status: 'idle', ...extra });
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');
  });
  afterEach(() => {
    history.replaceState(null, '', '/');
  });

  it('?code=abcdefgh opens Online with ABCDEF in Join, strips the parameter, and joins only after a nickname', async () => {
    history.replaceState(null, '', '/?code=abcdefgh');
    const joinGame = vi.fn<UseRoomConnectionResult['joinGame']>(() => Promise.resolve());
    const { user } = renderApp(home({ joinGame }));
    expect(title()).toBe('Play online');
    expect(codeField().value).toBe('ABCDEF');
    expect(window.location.search).toBe('');
    const join = screen.getByRole('button', { name: 'Join' });
    expect(join.hasAttribute('disabled')).toBe(true);
    await user.type(screen.getByLabelText('Nickname'), 'Ada');
    expect(joinGame).not.toHaveBeenCalled();
    await user.click(join);
    expect(joinGame.mock.calls).toEqual([['ABCDEF', 'Ada']]);
  });

  it('meets How to play first on a first visit; Skip enters Online with the code', async () => {
    localStorage.removeItem(HOW_TO_PLAY_SEEN_KEY);
    history.replaceState(null, '', '/?code=QWERTY');
    const { user } = renderApp(home());
    const howTo = screen.getByRole('dialog', { name: 'How to play' });
    expect(title()).toBe('Card Battle');
    await user.click(within(howTo).getByRole('button', { name: 'Skip' }));
    vi.useRealTimers(); // happy-dom finishes the sheet's exit on a real timer (docs/agent/testing.md)
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'How to play', hidden: true })).toBeNull();
    });
    expect(title()).toBe('Play online');
    expect(codeField().value).toBe('QWERTY');
  });

  it.each(['/?code=', '/'])('%s opens the hub as usual and pre-fills nothing', async (path) => {
    history.replaceState(null, '', path);
    const { user } = renderApp(home());
    expect(title()).toBe('Card Battle');
    expect(screen.queryByRole('textbox', { name: 'Game code' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Play online' }));
    expect(codeField().value).toBe('');
  });

  it('/admin?code=ABCDEF stays the admin tool and keeps its URL', () => {
    history.replaceState(null, '', '/admin?code=ABCDEF');
    renderApp(home());
    expect(screen.getByRole('main').getAttribute('data-mode')).toBe('tool');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Insights');
    expect(screen.queryByRole('textbox', { name: 'Game code' })).toBeNull();
    expect(window.location.search).toBe('?code=ABCDEF');
  });

  it('opens Online only until the first room view: back on Home after the lobby, it is the hub', () => {
    history.replaceState(null, '', '/?code=ABCDEF');
    const result = renderApp(home());
    expect(title()).toBe('Play online');
    show(result, fakeRoomConnection(guestLobbyView()));
    expect(screen.getByRole('button', { name: 'Leave' })).toBeTruthy();
    show(result, home());
    expect(title()).toBe('Card Battle');
  });
});
