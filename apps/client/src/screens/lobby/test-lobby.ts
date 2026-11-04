/**
 * Lobby test helpers (plan Appendix A.3, L76-02). They hold the three seats every lobby test uses,
 * the host, guest and walk-in views, `LobbyScreen` props with a `vi.fn()` per callback, the
 * commit-rule check (technical spec v7 §6.6.4, plan header "Commit rule for the lobby") and the
 * A.4 test hooks. `onDismissError` is not an intent, so `LOBBY_INTENT_PROPS` leaves it out (L76-14).
 * Tests only.
 */
import type { LobbySeatView, LobbyStateView } from '@card-battle/shared';
import { expect, vi } from 'vitest';

import { makeLobbyView, type LobbyViewOverrides } from '../../view-model/test-fixtures';
import type { LobbyScreenProps } from './lobby-screen';

export const LOBBY_HOST: LobbySeatView = { id: 'host', nickname: 'Ada', isBot: false, isReady: true };
export const LOBBY_GUEST: LobbySeatView = { id: 'guest', nickname: 'Bea', isBot: false, isReady: false };
export const LOBBY_BOT: LobbySeatView = { id: 'bot-1', nickname: 'Bot Cy', isBot: true, botDifficulty: 'normal', isReady: true };

/** Every callback that sends an intent. `onLeave` is not one: Leave is an immediate disconnect. */
export const LOBBY_INTENT_PROPS = [
  'onStart', 'onAddBot', 'onKickPlayer', 'onSetReady', 'onSetBotDifficulty',
  'onChooseKit', 'onSetLobbyRules', 'onSendChat',
] as const;

export function hostLobbyView(overrides: LobbyViewOverrides = {}): LobbyStateView {
  return makeLobbyView({ you: 'host', hostPlayerId: 'host', gameCode: 'ABCDEF', players: [LOBBY_HOST, LOBBY_GUEST, LOBBY_BOT], ...overrides });
}
export function guestLobbyView(overrides: LobbyViewOverrides = {}): LobbyStateView {
  return hostLobbyView({ you: 'guest', ...overrides });
}
export function walkInLobbyView(overrides: LobbyViewOverrides = {}): LobbyStateView {
  return hostLobbyView({ you: 'watcher', isSpectator: true, ...overrides });
}

export function makeLobbyProps(overrides: Partial<LobbyScreenProps> = {}): LobbyScreenProps {
  return {
    view: hostLobbyView(),
    status: 'connected',
    error: null,
    onDismissError: vi.fn(),
    onStart: vi.fn(),
    onLeave: vi.fn(),
    onAddBot: vi.fn(),
    onKickPlayer: vi.fn(),
    onSetReady: vi.fn(),
    onSetBotDifficulty: vi.fn(),
    onChooseKit: vi.fn(),
    onSetLobbyRules: vi.fn(),
    onSendChat: vi.fn(),
    ...overrides,
  };
}

export function expectNoLobbyIntent(props: LobbyScreenProps): void {
  for (const name of LOBBY_INTENT_PROPS) {
    const callback: unknown = props[name];
    if (vi.isMockFunction(callback)) expect(callback, name).not.toHaveBeenCalled();
  }
}

export function lobbySeat(playerId: string): HTMLElement {
  const seat = document.querySelector<HTMLElement>(`[data-lobby-seat="${playerId}"]`);
  if (seat === null) throw new Error(`no lobby seat ${playerId}`);
  return seat;
}

/** The scrim behind a lobby dialog: `[data-zone="sheet-overlay"]` (V7) or `[data-zone="dialog-overlay"]` (V2: the lobby until L76-12, Feedback until L76-07). */
export function lobbyBackdrop(dialog: HTMLElement): HTMLElement {
  const overlay = dialog.closest<HTMLElement>('[data-zone="sheet-overlay"], [data-zone="dialog-overlay"]');
  if (overlay === null) throw new Error('no dialog backdrop');
  return overlay;
}

/** Native `disabled`, or the V7 Button's `focusableWhenDisabled` (`aria-disabled="true"`). Either one sends nothing. */
export function isLobbyControlDisabled(control: HTMLElement): boolean {
  return control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true';
}
