// @vitest-environment happy-dom
/**
 * App wiring of the V7 arena over a mocked room connection (technical spec v7 §4.4): the lobby
 * rules the arena clock reads (§6.10, §6.11; L74-21), from L74-23 the walk-in Claim a seat, and
 * from L74-25 the raw connection status.
 */
import { defaultLobbyRules, type StateView } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import type { UseRoomConnectionResult } from './net/use-room-connection';
import { chatSeenCount, markChatSeen } from './screens/arena/chat-unread-store';
import { makeArenaView, makeTutorialArenaView } from './screens/arena/test-view';
import { RETIRED_TABLE_SWITCH_KEY } from './retired-table-switch';
import { renderUi } from './test/render';
import { makeFinishedView, makeLobbyView } from './view-model/test-fixtures';

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

const T0 = 1_000_000;

function connectionFor(view: StateView | null, extra: Partial<UseRoomConnectionResult> = {}): UseRoomConnectionResult {
  return {
    status: 'connected', view, error: null, actionReject: null, gameCode: view?.gameCode ?? null,
    lastTurnStarted: null, lastActionPlayed: null, lastActionResolved: null, subChoice: null, soloLaunchPending: false,
    lobbyRules: view?.phase === 'lobby' && view.lobbyRules !== undefined ? { gameCode: view.gameCode, rules: view.lobbyRules } : null,
    createGame: vi.fn(), joinGame: vi.fn(), leaveGame: vi.fn(() => Promise.resolve()), forfeit: vi.fn(),
    clearActionReject: vi.fn(), startGame: vi.fn(), startSoloGame: vi.fn(), startTutorialGame: vi.fn(),
    addBot: vi.fn(), removeBot: vi.fn(), kickPlayer: vi.fn(), playAgain: vi.fn(), claimSeat: vi.fn(),
    staySpectating: vi.fn(), setReady: vi.fn(), setBotDifficulty: vi.fn(), chooseKit: vi.fn(),
    setLobbyRules: vi.fn(), sendChat: vi.fn(), drawCard: vi.fn(), playCard: vi.fn(), playMultipleAttacks: vi.fn(),
    resolveSubChoice: vi.fn(), buyCard: vi.fn(), sellCard: vi.fn(), upgradeCard: vi.fn(), buyUpgradePoint: vi.fn(),
    buySpecialCard: vi.fn(), buyPoolCard: vi.fn(), clearSpy: vi.fn(), sellUpgradePoint: vi.fn(),
    deactivatePersistent: vi.fn(), activateDuplication: vi.fn(),
    ...extra,
  };
}
function region(name: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-arena-region="${name}"]`);
  if (found === null) throw new Error(`no ${name} region`);
  return found;
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});
afterEach(() => {
  history.replaceState(null, '', '/');
});

describe('App and the arena', () => {
  // The connection keeps the rules per STATE_UPDATE and resets them on leave
  // (`net/use-room-connection.lobby-rules.behavior.test.ts`, L74-26 gate G19); App hands this room's on.
  it("hands the arena the connection's lobby rules for this room only (§6.10, §6.11, L74-21, L74-26)", async () => {
    const rules = { gameCode: 'ROOM01', rules: { ...defaultLobbyRules(), turnTimeSeconds: 180 } };
    const leaveGame = vi.fn(() => Promise.resolve());
    const table = (gameCode: string) =>
      makeArenaView({ pov: 'eliminated', overrides: { gameCode, currentTurnPlayerId: 'p1', turnDeadlineMs: T0 + 180_000 } });
    fake.connection = connectionFor(table('ROOM01'), { leaveGame, lobbyRules: rules });
    const { rerender, user } = renderUi(<App />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
    const bar = (): Element | null => region('top-bar').querySelector('[role="progressbar"][aria-label="Turn timer"]');
    expect(bar()?.getAttribute('aria-valuenow')).toBe('100');
    await user.click(within(region('top-bar')).getByRole('button', { name: 'Leave table' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Leave the table?' })).getByRole('button', { name: 'Leave' }));
    expect(leaveGame).toHaveBeenCalledTimes(1);
    fake.connection = connectionFor(table('ROOM02'), { leaveGame, lobbyRules: rules });
    rerender(<App />);
    expect(bar()?.hasAttribute('aria-valuenow')).toBe(false);
  });

  it("forgets the room's chat seen count when the room is back in its lobby, so a rematch starts with the lobby lines seen (L74-16 carry-forward, L74-21)", () => {
    markChatSeen('CHATAG', 3);
    expect(chatSeenCount('CHATAG')).toBe(3);
    fake.connection = connectionFor(makeLobbyView({ gameCode: 'CHATAG' }));
    renderUi(<App />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
    expect(chatSeenCount('CHATAG')).toBeUndefined();
  });

  it('reopens the claim picker from Claim a seat after Stay, only while claimable seats exist (§7.2, Q24, L74-23)', async () => {
    const staySpectating = vi.fn<() => void>();
    const seats = [{ playerId: 'p1', nickname: 'p1' }];
    fake.connection = connectionFor(makeArenaView({ pov: 'walk-in', overrides: { claimableSeats: seats } }), { staySpectating });
    const { rerender, user } = renderUi(<App />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
    const picker = (): HTMLElement | null => screen.queryByRole('dialog', { name: 'Sit as a disconnected player?' });
    const open = picker();
    if (open === null) throw new Error('the claim picker did not open');
    await user.click(within(open).getByRole('button', { name: 'Stay spectating' }));
    expect(staySpectating).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(picker()).toBeNull();
    });
    await user.click(within(region('self-strip')).getByRole('button', { name: 'Claim a seat' }));
    expect(picker()).not.toBeNull();
    expect(staySpectating).toHaveBeenCalledTimes(1);
    fake.connection = connectionFor(makeArenaView({ pov: 'walk-in', overrides: { claimableSeats: [] } }), { staySpectating });
    rerender(<App />);
    await waitFor(() => {
      expect(picker()).toBeNull();
    });
    expect(within(region('self-strip')).queryByRole('button', { name: 'Claim a seat' })).toBeNull();
  });

  it('passes the raw connection status to the arena: Reconnecting… shows and intents lock (§6.12, L74-25)', () => {
    fake.connection = connectionFor(makeArenaView(), { status: 'reconnecting' });
    renderUi(<App />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
    expect(document.querySelector('[data-zone="reconnect-banner"]')?.textContent).toBe('Reconnecting…');
    expect(document.querySelector('[data-arena="next"]')?.getAttribute('data-action-lock')).toBe('actions-locked');
  });

  it('opens a tutorial room on the arena, with its coach (R9, L75-04, L75-09)', () => {
    fake.connection = connectionFor(makeTutorialArenaView(1));
    renderUi(<App />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
    expect(document.querySelector('[data-arena="next"]')).not.toBeNull();
    expect(document.querySelector('[data-zone="tutorial-coach"]')?.getAttribute('data-tutorial-index')).toBe('1');
  });

  it('opens the finished tutorial board on the arena, with no coach (R9, L75-04, L75-09)', () => {
    fake.connection = connectionFor(makeFinishedView({ finalTable: makeTutorialArenaView(30), lobbyRules: null }));
    renderUi(<App />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
    expect([document.querySelector('[data-arena="next"]') !== null, document.querySelector('[data-zone="tutorial-coach"]')]).toEqual([true, null]);
  });
});

describe('the arena is the only table (spec v7 §4.4, L75-09)', () => {
  const BOOTS = [
    { boot: 'no key', search: '', stored: null },
    { boot: '?ui=classic', search: '?ui=classic', stored: null },
    { boot: "a stale 'next' key", search: '', stored: 'next' },
    { boot: "?ui=classic over a stale 'next' key", search: '?ui=classic', stored: 'next' },
  ] as const;
  const TABLES = [
    { table: 'a Classic table', view: (): StateView => makeArenaView() },
    { table: 'a tutorial table', view: (): StateView => makeTutorialArenaView(1) },
    { table: 'a finished Classic board', view: (): StateView => makeFinishedView({ finalTable: makeArenaView() }) },
    { table: 'a finished tutorial board', view: (): StateView => makeFinishedView({ finalTable: makeTutorialArenaView(30), lobbyRules: null }) },
  ] as const;
  it.each(TABLES.flatMap((t) => BOOTS.map((b) => ({ ...t, ...b }))))('mounts the arena for $table with $boot, and the key is gone after boot', ({ view, search, stored }) => {
    if (stored !== null) localStorage.setItem(RETIRED_TABLE_SWITCH_KEY, stored);
    history.replaceState(null, '', `/${search}`);
    fake.connection = connectionFor(view());
    renderUi(<App />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
    expect(document.querySelector('main[data-arena="next"]')).not.toBeNull();
    expect(document.querySelector('.table-shell')).toBeNull();
    expect(localStorage.getItem(RETIRED_TABLE_SWITCH_KEY)).toBeNull();
  });

  it('clears a stale key on a Home or lobby boot too, so no later table reads it', () => {
    localStorage.setItem(RETIRED_TABLE_SWITCH_KEY, 'next');
    fake.connection = connectionFor(makeLobbyView());
    renderUi(<App />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
    expect(localStorage.getItem(RETIRED_TABLE_SWITCH_KEY)).toBeNull();
  });

  it('leaves ?ui=classic in the address bar: the param is no longer read, so nothing strips it', () => {
    history.replaceState(null, '', '/?ui=classic');
    fake.connection = connectionFor(makeArenaView());
    renderUi(<App />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
    expect(document.querySelector('main[data-arena="next"]')).not.toBeNull();
    expect(window.location.search).toBe('?ui=classic');
  });
});
