/**
 * Who-sees-what-of-whom Spy matrix — technical spec §5.1, backlog L3-05.
 *
 * Checked on every view construction. Never stored as a flag on the spied player.
 *
 * First grant captures a points snapshot at resolve (victim's turn).
 */

import type { GameState, SpyRelation, SpyVisibilityLevel } from '@card-battle/shared';

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
 * Grant or upgrade a Spy relation. An upgraded Spy may raise `kit-and-cards` to
 * `full-resources`; a weaker grant never downgrades.
 *
 * On first grant, freezes the subject's current points + `turnSequence` as
 * `pointsSnapshot` (base Spy display; upgraded uses live points instead).
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
            pointsSnapshot: {
              points: subject.points,
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
