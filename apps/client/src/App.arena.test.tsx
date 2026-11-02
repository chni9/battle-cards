// @vitest-environment happy-dom
/**
 * App wiring of the V7 arena over a mocked room connection (technical spec v7 §4.4): the lobby
 * rules the arena clock reads (§6.10, §6.11; L74-21), from L74-23 the walk-in Claim a seat, and
 * from L74-25 the raw connection status.
 */
import { defaultLobbyRules, type StateView } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import type { UseRoomConnectionResult } from './net/use-room-connection';
import { chatSeenCount, markChatSeen } from './screens/arena/chat-unread-store';
import { makeArenaView } from './screens/arena/test-view';
import { renderUi } from './test/render';
import { UI_SWITCH_STORAGE_KEY } from './ui-switch';
import { makeLobbyView } from './view-model/test-fixtures';

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
  localStorage.setItem(UI_SWITCH_STORAGE_KEY, 'next');
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

describe('App and the arena', () => {
  it("hands the arena the room's lobby rules after START_GAME, and forgets them on leave (§6.10, §6.11, L74-21)", async () => {
    fake.connection = connectionFor(makeLobbyView({ gameCode: 'ROOM01', lobbyRules: { ...defaultLobbyRules(), turnTimeSeconds: 180 } }));
    const { rerender, user } = renderUi(<App />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
    const leaveGame = vi.fn(() => Promise.resolve());
    fake.connection = connectionFor(
      makeArenaView({ pov: 'eliminated', overrides: { gameCode: 'ROOM01', currentTurnPlayerId: 'p1', turnDeadlineMs: T0 + 180_000 } }),
      { leaveGame },
    );
    rerender(<App />);
    const bar = (): Element | null => region('top-bar').querySelector('[role="progressbar"][aria-label="Turn timer"]');
    expect(bar()?.getAttribute('aria-valuenow')).toBe('100');
    await user.click(within(region('top-bar')).getByRole('button', { name: 'Leave table' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Leave the table?' })).getByRole('button', { name: 'Leave' }));
    expect(leaveGame).toHaveBeenCalledTimes(1);
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
});
