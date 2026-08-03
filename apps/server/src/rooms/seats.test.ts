import { describe, expect, it } from 'vitest';

import { canStartGame, MAX_PLAYERS } from './lobby-rules';
import {
  BOT_NICKNAME_POOL,
  createBotSeat,
  createBotSessionId,
  isBotSeat,
  isHumanSeat,
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

  it('1 human + 3 bots is full, startable, and unlocks when a bot is removed', () => {
    const seats: Seat[] = [human('host', 'Host')];
    seats.push(createBotSeat(seats, 'easy'));
    seats.push(createBotSeat(seats, 'normal'));
    seats.push(createBotSeat(seats, 'hard'));

    expect(seats).toHaveLength(4);
    expect(seats.filter(isBotSeat)).toHaveLength(3);
    expect(shouldLockForOccupancy(seats.length)).toBe(true);
    expect(
      canStartGame({
        requesterSessionId: 'host',
        hostSessionId: 'host',
        seatCount: seats.length,
        hasStarted: false,
      }),
    ).toBeNull();

    const nicknames = new Set(seats.map((seat) => seat.nickname.toLowerCase()));
    expect(nicknames.size).toBe(4);

    seats.pop();
    expect(shouldUnlockForOccupancy(seats.length)).toBe(true);
    expect(shouldLockForOccupancy(seats.length)).toBe(false);
  });
});
