/**
 * Lobby Ready chrome — L57-11 / L57-16 / PROTOCOL_VERSION 33.
 * Grey Start is not validation; the server still rejects `start-not-all-ready`.
 */

import { MIN_PLAYERS, type LobbySeatView, type LobbyStateView } from '@card-battle/shared';

export function lobbySeatIsHumanGuest(
  seat: LobbySeatView,
  hostPlayerId: string,
): boolean {
  return !seat.isBot && seat.id !== hostPlayerId;
}

export function lobbyGuestsReady(view: LobbyStateView): boolean {
  return view.players.every(
    (seat) => !lobbySeatIsHumanGuest(seat, view.hostPlayerId) || seat.isReady,
  );
}

/** Host Start enabled from view facts: occupancy + every human guest ready. */
export function lobbyStartEnabled(view: LobbyStateView): boolean {
  return view.players.length >= MIN_PLAYERS && lobbyGuestsReady(view);
}

export function lobbyShowsReadyToggle(view: LobbyStateView): boolean {
  const you = view.players.find((seat) => seat.id === view.you);
  return you !== undefined && lobbySeatIsHumanGuest(you, view.hostPlayerId);
}

export function lobbyReadyLabel(isReady: boolean): string {
  return isReady ? 'Ready' : 'Not ready';
}
