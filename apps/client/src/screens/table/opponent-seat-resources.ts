/**
 * Opponent seat resource presentation — L51-08.
 * Unspied and base Spy stay `?`; live numbers only from upgraded Spy or death reveal.
 * Must never print unspied totals (those fields are not on PublicPlayerView).
 */

import type { PublicPlayerView } from '@card-battle/shared';

export interface OpponentLiveResources {
  lives: number;
  points: number;
  upgradePoints: number;
  shield: number;
}

export type OpponentResourceDisplay =
  | { known: false }
  | { known: true; values: OpponentLiveResources };

export function opponentResourceDisplay(
  player: Pick<PublicPlayerView, 'spied' | 'eliminationReveal'>,
): OpponentResourceDisplay {
  const reveal = player.eliminationReveal;
  if (reveal !== undefined) {
    return {
      known: true,
      values: {
        lives: reveal.lives,
        points: reveal.points,
        upgradePoints: reveal.upgradePoints,
        shield: reveal.shield,
      },
    };
  }

  const spied = player.spied;
  const lives = spied?.lives;
  const points = spied?.points;
  const upgradePoints = spied?.upgradePoints;
  const shield = spied?.shield;
  if (
    lives !== undefined &&
    points !== undefined &&
    upgradePoints !== undefined &&
    shield !== undefined
  ) {
    return {
      known: true,
      values: { lives, points, upgradePoints, shield },
    };
  }

  return { known: false };
}

/** Kit identity is known — Draw amount may be read from the catalog (L51-09). */
export function opponentKitIsVisible(
  player: Pick<PublicPlayerView, 'spied' | 'eliminationReveal'>,
): boolean {
  return player.eliminationReveal !== undefined || player.spied !== undefined;
}

export function opponentHasLiveResourceIcons(
  player: Pick<PublicPlayerView, 'spied' | 'eliminationReveal'>,
): boolean {
  return opponentResourceDisplay(player).known;
}
