/**
 * Seat model — technical spec v3 §4.1 (L15-02).
 *
 * Pure types and helpers. The room owns the `Seat[]` array; this module does not.
 * Bot-ness lives here, not on engine `Player` (bots are never privileged callers).
 */

import { randomUUID } from 'node:crypto';

import type { BotDifficulty } from '@card-battle/shared';

import { MAX_PLAYERS } from './lobby-rules';

export interface HumanSeat {
  kind: 'human';
  sessionId: string;
  nickname: string;
}

export interface BotSeat {
  kind: 'bot';
  sessionId: string;
  nickname: string;
  difficulty: BotDifficulty;
}

export type Seat = HumanSeat | BotSeat;

/** Phonetic pool — skip names already seated (case-insensitive). technical spec v3 §4.1. */
export const BOT_NICKNAME_POOL = [
  'Alpha',
  'Bravo',
  'Charlie',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Hotel',
] as const;

export function isBotSeat(seat: Seat): seat is BotSeat {
  return seat.kind === 'bot';
}

export function isHumanSeat(seat: Seat): seat is HumanSeat {
  return seat.kind === 'human';
}

export function occupancyIsFull(seatCount: number): boolean {
  return seatCount >= MAX_PLAYERS;
}

/** Lock when total seats (humans + bots) hit capacity — not socket count. */
export function shouldLockForOccupancy(seatCount: number): boolean {
  return occupancyIsFull(seatCount);
}

/** Unlock when total seats fall below capacity. */
export function shouldUnlockForOccupancy(seatCount: number): boolean {
  return seatCount < MAX_PLAYERS;
}

/**
 * Server-generated bot identity. Prefixed `bot-`, unique among `existingIds`.
 * Same `sessionId` shape as humans for GameState / protocol / Postgres.
 */
export function createBotSessionId(existingIds: readonly string[]): string {
  const taken = new Set(existingIds);

  for (;;) {
    const candidate = `bot-${randomUUID()}`;

    if (!taken.has(candidate)) {
      return candidate;
    }
  }
}

/**
 * First phonetic name not taken (case-insensitive). If the pool is exhausted,
 * falls back to `Bot-${shortId}` (recorded in decisions.md as an escape hatch).
 */
export function pickBotNickname(takenNicknames: readonly string[]): string {
  const taken = new Set(takenNicknames.map((name) => name.toLowerCase()));

  for (const name of BOT_NICKNAME_POOL) {
    if (!taken.has(name.toLowerCase())) {
      return name;
    }
  }

  const shortId = randomUUID().slice(0, 8);
  return `Bot-${shortId}`;
}

export function createBotSeat(
  existingSeats: readonly Seat[],
  difficulty: BotDifficulty,
): BotSeat {
  const sessionId = createBotSessionId(existingSeats.map((seat) => seat.sessionId));
  const nickname = pickBotNickname(existingSeats.map((seat) => seat.nickname));

  return { kind: 'bot', sessionId, nickname, difficulty };
}
