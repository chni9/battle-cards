/**
 * The arena's server-reject notice — technical spec v7 §6.12 (a toast, not the V2 modal); Appendix A
 * `illegal-action-dialog` and `reject-state-carryover`; Part 2 Review Focus 4 (L74-25).
 *
 * - The V7 `Toast`, `tone="error"`, with the `resolveIllegalActionCopy` title and body and V2's OK.
 * - The Toast fires `onDismiss` once per open, for OK or the timer, and never on a rerender, so a
 *   state update never dismisses it (DESIGN.md › Overlays). A second reject while it is open swaps
 *   the copy in place and keeps the running timer.
 * - Every reject times out after `REJECT_TOAST_MS`: a live sheet's focus trap keeps Tab off OK.
 * - When App clears the reject, `open` turns false and the card fades out inert, then unmounts, so
 *   no overlay sticks (the L39-06 concern). A reject carried in from the lobby shows once at mount
 *   and times out.
 */

import type { ReactElement } from 'react';

import type { ActionRejectPayload } from '../../net/use-room-connection';
import { Toast } from '../../ui/primitives/toast';
import { resolveIllegalActionCopy } from '../illegal-action-copy';
import { REJECT_TOAST_MS } from './reject-model';

export function RejectToast({
  reject,
  onDismiss,
}: {
  readonly reject: ActionRejectPayload | null;
  readonly onDismiss: () => void;
}): ReactElement {
  const copy = reject === null ? null : resolveIllegalActionCopy(reject.code, reject.message);
  return (
    <Toast
      open={reject !== null}
      tone="error"
      title={copy?.title ?? ''}
      {...(copy !== null ? { body: copy.body } : {})}
      timeoutMs={REJECT_TOAST_MS}
      dismissLabel="OK"
      onDismiss={() => {
        onDismiss();
      }}
    />
  );
}
