// @vitest-environment happy-dom
/**
 * App wiring of the lobby over a mocked room connection (technical spec v7 §4.1: the hook's API is
 * unchanged). L76-14: the reject alert's dismiss and the phase-change clear (§7.2, Q26/Q29; A.9
 * ruling 7; Review Focus 3).
 */
import { ACTION_REJECT_MESSAGE, type StateView } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import type { ActionRejectPayload, UseRoomConnectionResult } from './net/use-room-connection';
import { guestLobbyView, hostLobbyView } from './screens/lobby/test-lobby';
import { fakeRoomConnection } from './test/fake-room-connection';
import { renderUi, type RenderUiResult } from './test/render';
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
