/**
 * Leave / forfeit confirm — technical spec v7 §6.12 ("Leave / forfeit: confirm sheet"), L43-05
 * (the first flag tap never leaves; Stay, Esc and the backdrop close it), L43-06. A V7 `Dialog`:
 * a read-only Sheet, placement `auto`, so Esc and the backdrop close through `onStay`. The body
 * has no control, so Stay, the first action, takes the initial focus.
 */

import type { ReactElement } from 'react';

import { Button } from '../../ui/primitives/button';
import { Dialog } from '../../ui/primitives/dialog';
import { STAY_LABEL } from '../../view-model/table-copy';
import { LEAVE_CONFIRM_CHROME, type LeaveConfirmIntent } from './top-bar-model';

export interface LeaveConfirmSheetProps {
  open: boolean;
  intent: LeaveConfirmIntent;
  onStay: () => void;
  onConfirm: () => void;
}

export function LeaveConfirmSheet({ open, intent, onStay, onConfirm }: LeaveConfirmSheetProps): ReactElement | null {
  const chrome = LEAVE_CONFIRM_CHROME[intent];
  return (
    <Dialog
      open={open}
      title={chrome.title}
      onClose={onStay}
      dataAttributes={{ 'data-arena-sheet': 'leave-confirm', 'data-flag-intent': intent }}
      actions={
        <>
          <Button variant="primary" onClick={onStay}>{STAY_LABEL}</Button>
          <Button variant="danger" onClick={onConfirm}>{chrome.confirm}</Button>
        </>
      }
    >
      {chrome.body !== null ? <p className="font-v7-body text-v7-body text-v7-text">{chrome.body}</p> : null}
    </Dialog>
  );
}
