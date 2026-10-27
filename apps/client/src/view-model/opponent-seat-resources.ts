/**
 * Opponent seat resource presentation — L51-08, Lot 69.
 * An unspied seat stays `?`. Every Spy relation, base or Spy+, carries live numbers on
 * `spied`; a death reveal carries the numbers frozen at death.
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

/** True for any Spy relation or death reveal (L51-09). Since Lot 69 it no longer means the kit is known: a base Spy has no `spied.kitId`. */
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

/** POV plus every seat with known totals: any Spy relation (live) or death reveal (frozen) (L51-11, Lot 69). */
export function collectLiveResourceSnaps(
  you: string,
  self: OpponentLiveResources,
  players: readonly PublicPlayerView[],
): Map<string, OpponentLiveResources> {
  const snaps = new Map<string, OpponentLiveResources>();
  snaps.set(you, self);
  for (const player of players) {
    if (player.id === you) {
      continue;
    }
    const display = opponentResourceDisplay(player);
    if (display.known) {
      snaps.set(player.id, display.values);
    }
  }
  return snaps;
}
