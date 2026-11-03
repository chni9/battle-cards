/**
 * Server rejects in the arena — technical spec v7 §6.6.2 (a rejected send springs its card back),
 * §6.12 (the reject toast); Part 2 Review Focus 4 (L74-25).
 *
 * Pure: which held card the last send spent, so `HandFan` can shake it when the server rejects
 * that send. An accepted intent always brings a state update, so a reject that arrives while the
 * view is still the one of the send belongs to that send.
 */

import type { PlayingStateView } from '@card-battle/shared';

import type { ActionRejectPayload } from '../../net/use-room-connection';

/**
 * Every reject toast times out, because a live sheet's focus trap keeps Tab off its OK (backlog
 * L74-25 watch point).
 */
export const REJECT_TOAST_MS = 6000;

/** The last send through the commit helper: the card it spent (null for one with none, such as Draw) and the view it left from. */
export interface LastSent {
  readonly instanceId: string | null;
  readonly view: PlayingStateView;
}

/** The held card to spring back and the reject it answers (a new reject replays the cue). */
export interface RejectCue {
  readonly instanceId: string;
  readonly reject: ActionRejectPayload;
}

/** §6.6.2: the held card the last send spent, when the reject arrives before any state update since that send. */
export function rejectCueFor(lastSent: LastSent | null, view: PlayingStateView, reject: ActionRejectPayload): RejectCue | null {
  if (lastSent === null) return null;
  const instanceId = lastSent.instanceId;
  // Same identity: no state update since the send. A new view means the send was accepted.
  if (instanceId === null || lastSent.view !== view) return null;
  const held = [...view.self.hand, ...view.self.specialCards].some((card) => card.instanceId === instanceId);
  return held ? { instanceId, reject } : null;
}
