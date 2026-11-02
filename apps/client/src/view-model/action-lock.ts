/**
 * Action lock — technical spec v7 §11; Lot 73 (L73-06).
 *
 * The reason every action is disabled before any per-action check runs. It carries over the V2
 * `table.tsx` `actionsLocked` (finished board, open sub-choice, eliminated POV, walk-in) and adds
 * the turn check. Every V7 action model starts from it.
 */

import type { PlayingStateView, SubChoiceRequiredPayload } from '@card-battle/shared';

export interface ActionContext {
  /** The open sub-choice, if any: the server rejects other actions while it is open. */
  subChoice: SubChoiceRequiredPayload | null;
  /** The finished board (`finished.finalTable` passed as the view). */
  readOnly: boolean;
  /** L74-25: the connection is reconnecting (spec v7 §6.12); every action locks. Never `readOnly`'s Stats dock. */
  reconnecting?: boolean;
}

export type LockReason = 'not-your-turn' | 'actions-locked';

/**
 * `actions-locked` while reconnecting (L74-25), for the finished board, an open sub-choice, an
 * eliminated POV or a walk-in; otherwise `not-your-turn` when the turn is not the POV's (another
 * seat's, or between turns); otherwise null. The POV's public entry is `view.players` at `view.you` (V2 `selfEliminated`).
 */
export function actionLock(view: PlayingStateView, ctx: ActionContext): LockReason | null {
  const pov = view.players.find((player) => player.id === view.you);
  if (
    ctx.reconnecting === true ||
    ctx.readOnly ||
    ctx.subChoice !== null ||
    pov?.isEliminated === true ||
    view.isSpectator === true
  ) {
    return 'actions-locked';
  }
  return view.currentTurnPlayerId === view.you ? null : 'not-your-turn';
}
