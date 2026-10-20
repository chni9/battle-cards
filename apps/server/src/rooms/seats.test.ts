import { describe, expect, it } from 'vitest';

import { canStartGame, MAX_PLAYERS } from './lobby-rules';
import {
  BOT_NICKNAME_POOL,
  createBotSeat,
  createBotSessionId,
  isBotSeat,
  isHumanSeat,
  nextLobbyHostId,
  occupancyIsFull,
  pickBotNickname,
  shouldLockForOccupancy,
  shouldUnlockForOccupancy,
  type HumanSeat,
  type Seat,
} from './seats';

function human(sessionId: string, nickname: string): HumanSeat {
  return { kind: 'human', sessionId, nickname };
}

describe('seats (L15-02)', () => {
  it('discriminates human and bot seats', () => {
    const h = human('h1', 'Host');
    const b = createBotSeat([h], 'normal');

    expect(isHumanSeat(h)).toBe(true);
    expect(isBotSeat(h)).toBe(false);
    expect(isBotSeat(b)).toBe(true);
    expect(isHumanSeat(b)).toBe(false);
  });

  it('creates unique bot- prefixed session ids', () => {
    const a = createBotSessionId([]);
    const b = createBotSessionId([a]);

    expect(a.startsWith('bot-')).toBe(true);
    expect(b.startsWith('bot-')).toBe(true);
    expect(a).not.toBe(b);
  });

  it('picks phonetic nicknames skipping taken names case-insensitively', () => {
    expect(pickBotNickname([])).toBe('Alpha');
    expect(pickBotNickname(['alpha', 'Bravo'])).toBe('Charlie');
  });

  it('falls back when the phonetic pool is exhausted', () => {
    const nick = pickBotNickname([...BOT_NICKNAME_POOL]);

    expect(nick.startsWith('Bot-')).toBe(true);
  });

  it('locks at MAX_PLAYERS total seats and unlocks below', () => {
    expect(occupancyIsFull(MAX_PLAYERS)).toBe(true);
    expect(shouldLockForOccupancy(MAX_PLAYERS)).toBe(true);
    expect(shouldUnlockForOccupancy(MAX_PLAYERS - 1)).toBe(true);
    expect(shouldUnlockForOccupancy(MAX_PLAYERS)).toBe(false);
  });

  it('1 human + MAX_PLAYERS − 1 bots is full, startable, and unlocks when a bot is removed', () => {
    const seats: Seat[] = [human('host', 'Host')];
    while (seats.length < MAX_PLAYERS) {
      seats.push(createBotSeat(seats, 'normal'));
    }

    expect(seats).toHaveLength(MAX_PLAYERS);
    expect(seats.filter(isBotSeat)).toHaveLength(MAX_PLAYERS - 1);
    expect(shouldLockForOccupancy(seats.length)).toBe(true);
    expect(
      canStartGame({
        requesterSessionId: 'host',
        hostSessionId: 'host',
        seatCount: seats.length,
        hasStarted: false,
        humanGuests: [],
      }),
    ).toBeNull();

    const nicknames = new Set(seats.map((seat) => seat.nickname.toLowerCase()));
    expect(nicknames.size).toBe(MAX_PLAYERS);

    seats.pop();
    expect(shouldUnlockForOccupancy(seats.length)).toBe(true);
    expect(shouldLockForOccupancy(seats.length)).toBe(false);
  });
});

describe('lobby host after the host leaves (L1-02, technical spec v3 §6)', () => {
  it('passes the host to the human guest, not to a bot seated before them', () => {
    const host = human('host', 'Host');
    const bot = createBotSeat([host], 'normal');
    const guest = human('guest', 'Guest');

    expect(
      nextLobbyHostId({
        remainingSeats: [bot, guest],
        connectedPlayerIds: new Set([guest.sessionId]),
      }),
    ).toBe(guest.sessionId);
  });

  it('prefers a connected human over an earlier human who dropped', () => {
    const dropped = human('dropped', 'Dropped');
    const bot = createBotSeat([dropped], 'easy');
    const online = human('online', 'Online');

    expect(
      nextLobbyHostId({
        remainingSeats: [dropped, bot, online],
        connectedPlayerIds: new Set([online.sessionId]),
      }),
    ).toBe(online.sessionId);
  });

  it('falls back to the earliest human seat when no human is connected', () => {
    const bot = createBotSeat([], 'hard');
    const first = human('first', 'First');
    const second = human('second', 'Second');

    expect(
      nextLobbyHostId({
        remainingSeats: [bot, first, second],
        connectedPlayerIds: new Set(),
      }),
    ).toBe(first.sessionId);
  });

  it('keeps the earliest seat when only bots remain (the room then disposes, L15-06)', () => {
    const bot = createBotSeat([], 'normal');
    const other = createBotSeat([bot], 'easy');

    expect(
      nextLobbyHostId({
        remainingSeats: [bot, other],
        connectedPlayerIds: new Set(),
      }),
    ).toBe(bot.sessionId);
  });

  it('has no host when no seat remains', () => {
    expect(nextLobbyHostId({ remainingSeats: [], connectedPlayerIds: new Set() })).toBeNull();
  });
});
