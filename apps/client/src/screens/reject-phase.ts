/**
 * When App clears the shared reject (`error` + `actionReject`): a reject belongs to the screen it
 * arrived on (technical spec v7 §7.2 "cleared on phase change", §11 Q26 / Q29; plan A.9 ruling 7).
 * A change to or from no room (Home) never clears, so "You were kicked." and a solo-launch failure
 * still show on Home. Within a phase a state update never clears it (L39-06). L76-14.
 */

import type { StateView } from '@card-battle/shared';

export type ViewPhase = StateView['phase'];

/** previous !== null && next !== null && previous !== next (A.9 ruling 7). */
export function shouldClearRejectOnPhaseChange(previous: ViewPhase | null, next: ViewPhase | null): boolean {
  return previous !== null && next !== null && previous !== next;
}
