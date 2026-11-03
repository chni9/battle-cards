/** Lobby seat rows: technical spec v7 §7.2, §11 (Q25, Q39); parity lobby-player-list, lobby-add-bot (L76-12). */
import { ACTION_REJECT_MESSAGE } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { lobbyCanAddBot, lobbySeatRows, lobbyStartReason } from './lobby-seat-model';
import { guestLobbyView, hostLobbyView, LOBBY_BOT, LOBBY_GUEST, LOBBY_HOST, walkInLobbyView } from './test-lobby';

describe('lobbySeatRows', () => {
  it('gives one row per seat, in view.players order, with that index as the seat hue', () => {
    const rows = lobbySeatRows(hostLobbyView({ players: [LOBBY_GUEST, LOBBY_BOT, LOBBY_HOST] }));
    expect(rows.map((row) => [row.id, row.seatIndex])).toEqual([['guest', 0], ['bot-1', 1], ['host', 2]]);
  });
  it('marks you, the host, the ready words and the bot tier', () => {
    expect(lobbySeatRows(guestLobbyView())).toEqual([
      { id: 'host', nickname: 'Ada', seatIndex: 0, isYou: false, isHost: true, isReady: true, readyLabel: 'Ready', botDifficulty: null, canKick: false, canSetDifficulty: false },
      { id: 'guest', nickname: 'Bea', seatIndex: 1, isYou: true, isHost: false, isReady: false, readyLabel: 'Not ready', botDifficulty: null, canKick: false, canSetDifficulty: false },
      { id: 'bot-1', nickname: 'Bot Cy', seatIndex: 2, isYou: false, isHost: false, isReady: true, readyLabel: 'Ready', botDifficulty: 'normal', canKick: false, canSetDifficulty: false },
    ]);
  });
  it('lets the host kick every other seat and set a difficulty on bots only', () => {
    expect(lobbySeatRows(hostLobbyView()).map((row) => [row.id, row.canKick, row.canSetDifficulty])).toEqual([
      ['host', false, false], ['guest', true, false], ['bot-1', true, true],
    ]);
  });
  it('gives a walk-in no own seat and no control', () => {
    expect(lobbySeatRows(walkInLobbyView()).some((row) => row.isYou || row.canKick || row.canSetDifficulty)).toBe(false);
  });
});

describe('lobbyCanAddBot', () => {
  it('opens Add bot to the host below 8 seats only', () => {
    const bots = (count: number) => Array.from({ length: count }, (_, index) => ({ ...LOBBY_BOT, id: `bot-${index}` }));
    expect(lobbyCanAddBot(hostLobbyView({ players: [LOBBY_HOST, ...bots(6)] }))).toBe(true);
    expect(lobbyCanAddBot(hostLobbyView({ players: [LOBBY_HOST, ...bots(7)] }))).toBe(false);
    expect(lobbyCanAddBot(guestLobbyView())).toBe(false);
  });
});

describe('lobbyStartReason', () => {
  it('names why Start is grey with the reject words, and nothing once lobbyStartEnabled', () => {
    expect(lobbyStartReason(hostLobbyView({ players: [LOBBY_HOST] }))).toBe(ACTION_REJECT_MESSAGE['start-not-enough-players']);
    expect(lobbyStartReason(hostLobbyView())).toBe(ACTION_REJECT_MESSAGE['start-not-all-ready']);
    expect(lobbyStartReason(hostLobbyView({ players: [LOBBY_HOST, { ...LOBBY_GUEST, isReady: true }] }))).toBeNull();
    expect(lobbyStartReason(hostLobbyView({ players: [LOBBY_HOST, LOBBY_BOT] }))).toBeNull();
  });
});
