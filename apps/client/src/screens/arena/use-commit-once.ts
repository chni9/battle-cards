/**
 * One send per control per view — Lot 74 Part 1 final review, issue I3 and controller ruling R2;
 * technical spec v7 §1 ("an accidental tap never spends the turn"), §6.6.4.
 *
 * A commit button outside a sheet (the dock's Draw and Activate duplication) stays enabled until
 * the next state update, so a double tap would send twice and the server would reject the second.
 * `useCommitOnce` latches a control once its send went out:
 *
 * - **Only a real send latches.** `send` returns whether it went out. A send the arena's tap guard
 *   swallowed (`dockCommit` returns false) leaves the control live, never enabled-looking but dead.
 * - **Per control.** Each control name has its own latch, so an Unspy Confirm followed quickly by
 *   Draw still draws.
 * - **Re-armed by a new view or a new reject.** A new view identity (any state update, a new
 *   `turnSequence` included) re-arms every latch, as the card sheet's per-view latch does. So does a
 *   changed `reject` (`actionReject`): a rejected send may come with no state update, and a button
 *   that never closes would otherwise stay dead for the rest of the turn.
 *
 * The latch is a ref, read and written only in the event handler that calls the returned function
 * (React Compiler: no ref access during render). L74-14 (Buy, a tile double tap) and L74-18 (the
 * sub-choice Confirm) reuse it instead of hand-rolling another latch.
 */

import { useRef } from 'react';

/** What re-arms every latch: the view identity and the last reject. */
export interface CommitOnceEpoch {
  readonly view: object;
  readonly reject: unknown;
}

/**
 * Runs `send` unless `control` already sent in this epoch, and latches `control` only when `send`
 * returns true. Returns whether it sent.
 */
export type CommitOnce = (control: string, send: () => boolean) => boolean;

interface Latch extends CommitOnceEpoch {
  readonly controls: ReadonlySet<string>;
}

export function useCommitOnce({ view, reject }: CommitOnceEpoch): CommitOnce {
  const latch = useRef<Latch | null>(null);
  return (control, send) => {
    const current = latch.current;
    const sameEpoch = current !== null && current.view === view && current.reject === reject;
    if (sameEpoch && current.controls.has(control)) {
      return false;
    }
    if (!send()) {
      return false;
    }
    latch.current = {
      view,
      reject,
      controls: new Set(sameEpoch ? [...current.controls, control] : [control]),
    };
    return true;
  };
}
