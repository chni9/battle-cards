/**
 * Game-over award ranking — L60-05.
 */

import { describe, expect, it } from 'vitest';

import type { GameRecapPlayerView, GameRecapView } from '@card-battle/shared';

import {
  formatThinkTimeMs,
  pickGameOverAwards,
} from './game-over-awards';

function recapRow(
  playerId: string,
  patch: Partial<Omit<GameRecapPlayerView, 'playerId' | 'kitId'>> & {
    kitId?: GameRecapPlayerView['kitId'];
  } = {},
): GameRecapPlayerView {
  const row: GameRecapPlayerView = {
    playerId,
    cardsPlayedCount: 0,
    buyCount: 0,
    sellCount: 0,
    upgradeCount: 0,
    isBot: false,
    livesLost: 0,
    livesGained: 0,
    pointsSpent: 0,
    pointsGained: 0,
    upgradePointsSpent: 0,
    specialsPlayedCount: 0,
    buyCardCount: 0,
    sellCardCount: 0,
    drawCount: 0,
    attacksPlayedCount: 0,
    damageDealt: 0,
    kills: 0,
    thinkTimeMs: 0,
  };

  const { kitId, ...rest } = patch;
  Object.assign(row, rest);

  if (kitId !== undefined) {
    row.kitId = kitId;
  }

  return row;
}

function recapOf(players: readonly GameRecapPlayerView[]): GameRecapView {
  return { turnSequence: 4, players, eliminations: [] };
}

describe('pickGameOverAwards (L60-05)', () => {
  it('skips an award when every eligible seat is tied at 0', () => {
    const awards = pickGameOverAwards(
      recapOf([recapRow('a', { kitId: 'untouchable' }), recapRow('b', { kitId: 'warrior' })]),
    );

    expect(awards.map((award) => award.id)).toEqual([]);
  });

  it('includes every co-winner on a tie', () => {
    const awards = pickGameOverAwards(
      recapOf([
        recapRow('a', { kills: 2, kitId: 'untouchable' }),
        recapRow('b', { kills: 2, kitId: 'warrior' }),
        recapRow('c', { kills: 1, kitId: 'assassin' }),
      ]),
    );
    const kills = awards.find((award) => award.id === 'most-kills');

    expect(kills?.winners.map((winner) => winner.playerId)).toEqual(['a', 'b']);
  });

  it('lets bots compete for non-clock awards', () => {
    const awards = pickGameOverAwards(
      recapOf([
        recapRow('human', { kills: 1, kitId: 'untouchable' }),
        recapRow('bot', { isBot: true, kills: 4, kitId: 'warrior' }),
      ]),
    );
    const kills = awards.find((award) => award.id === 'most-kills');

    expect(kills?.winners.map((winner) => winner.playerId)).toEqual(['bot']);
  });

  it('excludes bots from Slowest / Fastest and skips clocks with fewer than two humans', () => {
    const oneHuman = pickGameOverAwards(
      recapOf([
        recapRow('human', { thinkTimeMs: 4_000, kitId: 'untouchable' }),
        recapRow('bot', { isBot: true, thinkTimeMs: 90_000, kitId: 'warrior' }),
      ]),
    );
    expect(oneHuman.some((award) => award.id === 'slowest' || award.id === 'fastest')).toBe(
      false,
    );

    const twoHumans = pickGameOverAwards(
      recapOf([
        recapRow('fast', { thinkTimeMs: 1_000, kitId: 'untouchable' }),
        recapRow('slow', { thinkTimeMs: 8_000, kitId: 'warrior' }),
        recapRow('bot', { isBot: true, thinkTimeMs: 50_000, kitId: 'assassin' }),
      ]),
    );
    expect(twoHumans.find((award) => award.id === 'slowest')?.winners[0]?.playerId).toBe(
      'slow',
    );
    expect(twoHumans.find((award) => award.id === 'fastest')?.winners[0]?.playerId).toBe(
      'fast',
    );
  });

  it('skips Slowest / Fastest when both humans are tied at 0', () => {
    const awards = pickGameOverAwards(
      recapOf([
        recapRow('a', { thinkTimeMs: 0, kitId: 'untouchable' }),
        recapRow('b', { thinkTimeMs: 0, kitId: 'warrior' }),
      ]),
    );

    expect(awards.some((award) => award.id === 'slowest' || award.id === 'fastest')).toBe(
      false,
    );
  });

  it('awards Fewest attacks to zeros when someone else attacked', () => {
    const awards = pickGameOverAwards(
      recapOf([
        recapRow('a', { attacksPlayedCount: 0, kitId: 'untouchable' }),
        recapRow('b', { attacksPlayedCount: 3, kitId: 'warrior' }),
      ]),
    );
    const fewest = awards.find((award) => award.id === 'fewest-attacks');
    const most = awards.find((award) => award.id === 'most-attacks');

    expect(fewest?.winners.map((winner) => winner.playerId)).toEqual(['a']);
    expect(most?.winners.map((winner) => winner.playerId)).toEqual(['b']);
  });

  it('skips Fewest attacks when nobody attacked', () => {
    const awards = pickGameOverAwards(
      recapOf([recapRow('a', { kitId: 'untouchable' }), recapRow('b', { kitId: 'warrior' })]),
    );

    expect(awards.some((award) => award.id === 'fewest-attacks')).toBe(false);
  });

  it('uses Fewest attacks as the label, not Pacifist', () => {
    const awards = pickGameOverAwards(
      recapOf([
        recapRow('a', { attacksPlayedCount: 1, kitId: 'untouchable' }),
        recapRow('b', { attacksPlayedCount: 4, kitId: 'warrior' }),
      ]),
    );
    const fewest = awards.find((award) => award.id === 'fewest-attacks');

    expect(fewest?.title).toBe('Fewest attacks');
    expect(fewest?.title.toLowerCase()).not.toContain('pacifist');
  });
});

describe('formatThinkTimeMs (L60-05)', () => {
  it('renders seconds under a minute and mm:ss past it', () => {
    expect(formatThinkTimeMs(0)).toBe('0s');
    expect(formatThinkTimeMs(1_500)).toBe('1.5s');
    expect(formatThinkTimeMs(65_000)).toBe('1m 5s');
  });
});
