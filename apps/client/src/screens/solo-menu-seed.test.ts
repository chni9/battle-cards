/**
 * Solo Play again opens the solo menu with the finished kit and bot count.
 */

import { describe, expect, it } from 'vitest';

import { defaultLobbyRules } from '@card-battle/shared';

import { soloMenuSeed } from './solo-menu-seed';

const rules = defaultLobbyRules();

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
        lobbyRules: rules,
      }),
    ).toEqual({
      opponentCount: 2,
      difficulty: 'easy',
      kitSelection: 'assassin',
      lobbyRules: rules,
    });
  });

  it('leaves a two-human table on the rematch lobby', () => {
    expect(
      soloMenuSeed({
        playKind: 'classic',
        players: [ada, { isYou: false, isBot: false }, alpha],
        kitId: 'assassin',
        lobbyRules: rules,
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
        lobbyRules: rules,
      }),
    ).toBeNull();
    expect(
      soloMenuSeed({
        playKind: 'tutorial',
        players: [ada, alpha],
        kitId: 'assassin',
        lobbyRules: rules,
      }),
    ).toBeNull();
  });

  it('keeps the host rules on Play again', () => {
    const kept = {
      excludedKitIds: ['ghost' as const],
      randomOnly: true,
      turnTimeSeconds: 45,
    };
    expect(
      soloMenuSeed({
        playKind: 'classic',
        players: [ada, alpha],
        kitId: 'assassin',
        lobbyRules: kept,
      })?.lobbyRules,
    ).toEqual(kept);
  });
});
