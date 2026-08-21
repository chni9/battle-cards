/**
 * Stay / Forfeit and spectator Stay / Leave confirms — L43-05.
 * Esc / overlay = Stay. First flag click only opens this dialog.
 */

import type { ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { Dialog } from '../../design/components/dialog';
import {
  FORFEIT_ACTION_LABEL,
  FORFEIT_CONFIRM_BODY,
  FORFEIT_CONFIRM_TITLE,
  LEAVE_TABLE_ACTION_LABEL,
  LEAVE_TABLE_CONFIRM_TITLE,
  STAY_LABEL,
} from './table-copy';
import type { TableFlagIntent } from './table-flag-intent';

export interface TableLeaveConfirmProps {
  intent: Exclude<TableFlagIntent, 'hidden'> | null;
  onStay: () => void;
  onConfirm: () => void;
}

export function TableLeaveConfirm({
  intent,
  onStay,
  onConfirm,
}: TableLeaveConfirmProps): ReactElement | null {
  if (intent === null) {
    return null;
  }

  const isForfeit = intent === 'forfeit';

  return (
    <Dialog
      open
      title={isForfeit ? FORFEIT_CONFIRM_TITLE : LEAVE_TABLE_CONFIRM_TITLE}
      onClose={onStay}
      actions={
        <>
          <Button variant="green" onClick={onStay}>
            {STAY_LABEL}
          </Button>
          <Button variant="red" onClick={onConfirm}>
            {isForfeit ? FORFEIT_ACTION_LABEL : LEAVE_TABLE_ACTION_LABEL}
          </Button>
        </>
      }
    >
      {isForfeit ? (
        <p className="text-sm text-ink">{FORFEIT_CONFIRM_BODY}</p>
      ) : (
        <p className="sr-only">{LEAVE_TABLE_CONFIRM_TITLE}</p>
      )}
    </Dialog>
  );
}
