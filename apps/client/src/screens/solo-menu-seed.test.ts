/**
 * Solo Play again opens the solo menu with the finished kit and bot count.
 */

import { describe, expect, it } from 'vitest';

import { soloMenuSeed } from './solo-menu-seed';

const ada = { isYou: true, isBot: false };
const alpha = { isYou: false, isBot: true, botDifficulty: 'easy' as const };
const beta = { isYou: false, isBot: true, botDifficulty: 'easy' as const };

describe('solo Play again menu (L67-01)', () => {
  it('keeps kit, bot count, and the shared bot difficulty', () => {
    expect(
      soloMenuSeed({
        playKind: 'classic',
        players: [ada, alpha, beta],
        kitId: 'assassin',
      }),
    ).toEqual({
      opponentCount: 2,
      difficulty: 'easy',
      kitSelection: 'assassin',
    });
  });

  it('leaves a two-human table on the rematch lobby', () => {
    expect(
      soloMenuSeed({
        playKind: 'classic',
        players: [ada, { isYou: false, isBot: false }, alpha],
        kitId: 'assassin',
      }),
    ).toBeNull();
  });

  it('does not treat a spectator or a tutorial as solo', () => {
    expect(
      soloMenuSeed({
        playKind: 'classic',
        isSpectator: true,
        players: [ada, alpha],
        kitId: 'assassin',
      }),
    ).toBeNull();
    expect(
      soloMenuSeed({
        playKind: 'tutorial',
        players: [ada, alpha],
        kitId: 'assassin',
      }),
    ).toBeNull();
  });
});
