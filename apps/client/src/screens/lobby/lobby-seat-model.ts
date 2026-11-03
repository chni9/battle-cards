/**
 * Lobby seat rows (technical spec v7 §7.2, seats as a mini arena; §11 Q25, the seat hue is the
 * `view.players` index; §11 Q39, a grey control says why). Pure: the lobby components render
 * these rows and decide nothing (golden rule 8). Plan Appendix A.4, L76-12.
 */

import {
  ACTION_REJECT_MESSAGE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type BotDifficulty,
  type LobbyStateView,
} from '@card-battle/shared';

import { lobbyGuestsReady, lobbyReadyLabel } from './lobby-ready';

export interface LobbySeatRow {
  readonly id: string;
  readonly nickname: string;
  /** Index in view.players: the seat hue (v7SeatColor) and the Avatar seatIndex (Q25). */
  readonly seatIndex: number;
  readonly isYou: boolean;
  readonly isHost: boolean;
  readonly isReady: boolean;
  /** lobbyReadyLabel(isReady): 'Ready' | 'Not ready'. */
  readonly readyLabel: string;
  readonly botDifficulty: BotDifficulty | null;
  /** The viewer is the host and this is another seat (bot or human). */
  readonly canKick: boolean;
  /** canKick && botDifficulty !== null. */
  readonly canSetDifficulty: boolean;
}

/** One row per `view.players` entry, in that order: nothing sorts. */
export function lobbySeatRows(view: LobbyStateView): readonly LobbySeatRow[] {
  const isHostViewer = view.hostPlayerId === view.you;
  return view.players.map((seat, seatIndex): LobbySeatRow => {
    const canKick = isHostViewer && seat.id !== view.you;
    const botDifficulty = seat.isBot ? (seat.botDifficulty ?? null) : null;
    return {
      id: seat.id,
      nickname: seat.nickname,
      seatIndex,
      isYou: seat.id === view.you,
      isHost: seat.id === view.hostPlayerId,
      isReady: seat.isReady,
      readyLabel: lobbyReadyLabel(seat.isReady),
      botDifficulty,
      canKick,
      canSetDifficulty: canKick && botDifficulty !== null,
    };
  });
}

/** The viewer is the host and the table has fewer than MAX_PLAYERS seats (parity lobby-add-bot). */
export function lobbyCanAddBot(view: LobbyStateView): boolean {
  return view.hostPlayerId === view.you && view.players.length < MAX_PLAYERS;
}

/**
 * Why Start is grey, in the server's reject words (§11 Q39); null exactly when lobbyStartEnabled(view).
 * These are the two conditions of `lobbyStartEnabled`, so it decides nothing new.
 */
export function lobbyStartReason(view: LobbyStateView): string | null {
  if (view.players.length < MIN_PLAYERS) return ACTION_REJECT_MESSAGE['start-not-enough-players'];
  if (!lobbyGuestsReady(view)) return ACTION_REJECT_MESSAGE['start-not-all-ready'];
  return null;
}
