/**
 * Tutorial create/join helpers — technical spec v6 §5.3 / L41-05.
 * Pure so GameRoom onAuth can stay a thin ServerError wrapper.
 */

import type { PlayKind } from '@card-battle/shared';

/** True only when create options set `tutorial: true`. Ignore joinById extras. */
export function readTutorialCreateOption(options: unknown): boolean {
  if (typeof options !== 'object' || options === null || !('tutorial' in options)) {
    return false;
  }

  return options.tutorial === true;
}

/**
 * Extra humans cannot enter a tutorial room (technical spec v6 §5.3).
 * First creator is allowed (`seatedHumanCount === 0` at their onAuth).
 */
export function shouldRejectTutorialJoin(
  playKind: PlayKind,
  seatedHumanCount: number,
): boolean {
  return playKind === 'tutorial' && seatedHumanCount >= 1;
}

/** Client never addBot; reject ADD_BOT in tutorial rooms (designer 2026-08-25). */
export function shouldRejectTutorialAddBot(playKind: PlayKind): boolean {
  return playKind === 'tutorial';
}
