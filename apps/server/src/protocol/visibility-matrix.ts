/**
 * Who-sees-what-of-whom Spy matrix — technical spec §5.1, backlog L3-05.
 *
 * Checked on every view construction. Never stored as a flag on the spied player.
 *
 * First grant captures a full resource snapshot at resolve (victim's turn).
 *
 * Eliminated spectators (no pending Reanimation) see every other seat as upgraded
 * Spy without writing matrix rows (designer 2026-08-06) — see `recipientSeesPrivateOf`.
 */

import type { GameState, Player, SpyRelation, SpyVisibilityLevel } from '@card-battle/shared';

const LEVEL_RANK: Record<SpyVisibilityLevel, number> = {
  'kit-and-cards': 1,
  'full-resources': 2,
};

export function findSpyRelation(
  state: GameState,
  viewerId: string,
  subjectId: string,
): SpyRelation | undefined {
  return state.visibility.find(
    (relation) => relation.viewerId === viewerId && relation.subjectId === subjectId,
  );
}

/**
 * Pure spectator: eliminated with no pending revive. Designer 2026-08-06 —
 * these seats get upgraded-Spy vision of every other player at view time.
 * Pending Reanimation (or a later revive) does **not** qualify.
 */
export function isEliminatedSpectator(player: Player): boolean {
  return player.isEliminated && player.pendingReanimation === null;
}

/**
 * True when `viewerId` may see `subjectId`'s private kit / hand / live resources
 * and Spy-gated log lines: real Spy relation **or** eliminated spectator overlay.
 */
export function recipientSeesPrivateOf(
  state: GameState,
  viewerId: string,
  subjectId: string,
): boolean {
  if (viewerId === subjectId) {
    return true;
  }

  if (findSpyRelation(state, viewerId, subjectId) !== undefined) {
    return true;
  }

  const viewer = state.players.find((player) => player.id === viewerId);
  return viewer !== undefined && isEliminatedSpectator(viewer);
}

/**
 * Grant or upgrade a Spy relation. An upgraded Spy may raise `kit-and-cards` to
 * `full-resources`; a weaker grant never downgrades.
 *
 * On first grant, freezes the subject's current resources + `turnSequence` as
 * `resourcesSnapshot` (base Spy display; upgraded uses live values instead).
 */
export function grantSpy(
  state: GameState,
  viewerId: string,
  subjectId: string,
  level: SpyVisibilityLevel,
): void {
  const existing = findSpyRelation(state, viewerId, subjectId);

  if (existing === undefined) {
    const subject = state.players.find((player) => player.id === subjectId);
    const relation: SpyRelation = {
      viewerId,
      subjectId,
      level,
      ...(subject !== undefined
        ? {
            resourcesSnapshot: {
              lives: subject.lives,
              points: subject.points,
              upgradePoints: subject.upgradePoints,
              shield: subject.shield,
              turnSequence: state.turnSequence,
            },
          }
        : {}),
    };
    state.visibility.push(relation);
    return;
  }

  if (LEVEL_RANK[level] > LEVEL_RANK[existing.level]) {
    existing.level = level;
  }
}
