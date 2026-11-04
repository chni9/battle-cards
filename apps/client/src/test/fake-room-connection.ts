/**
 * A full `UseRoomConnectionResult` for App-level tests (technical spec v7 §4.1: the hook's API is
 * unchanged, so App tests mock `net/use-room-connection` and hand App this object). Every intent
 * and command is a `vi.fn()`; `extra` overrides any member. The field set is the local
 * `connectionFor` of `App.arena.test.tsx`, which keeps its own copy (Lot 75 owns that file). L76-14.
 */
import type { StateView } from '@card-battle/shared';
import { vi } from 'vitest';

import type { UseRoomConnectionResult } from '../net/use-room-connection';

export function fakeRoomConnection(
  view: StateView | null,
  extra: Partial<UseRoomConnectionResult> = {},
): UseRoomConnectionResult {
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
