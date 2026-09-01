/**
 * Stay / Forfeit, spectator Stay / Leave, and finished Stay / Return home confirms.
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
  RETURN_HOME_ACTION_LABEL,
  RETURN_HOME_CONFIRM_BODY,
  RETURN_HOME_CONFIRM_TITLE,
  SKIP_TUTORIAL_ACTION_LABEL,
  SKIP_TUTORIAL_CONFIRM_BODY,
  SKIP_TUTORIAL_CONFIRM_TITLE,
  STAY_LABEL,
} from './table-copy';
import type { TableFlagIntent } from './table-flag-intent';

export interface TableLeaveConfirmProps {
  intent: Exclude<TableFlagIntent, 'hidden'> | null;
  onStay: () => void;
  onConfirm: () => void;
}

function confirmChrome(intent: Exclude<TableFlagIntent, 'hidden'>): {
  title: string;
  body: string | null;
  confirm: string;
} {
  if (intent === 'forfeit') {
    return {
      title: FORFEIT_CONFIRM_TITLE,
      body: FORFEIT_CONFIRM_BODY,
      confirm: FORFEIT_ACTION_LABEL,
    };
  }
  if (intent === 'leaveTable') {
    return {
      title: LEAVE_TABLE_CONFIRM_TITLE,
      body: null,
      confirm: LEAVE_TABLE_ACTION_LABEL,
    };
  }
  if (intent === 'skipTutorial') {
    return {
      title: SKIP_TUTORIAL_CONFIRM_TITLE,
      body: SKIP_TUTORIAL_CONFIRM_BODY,
      confirm: SKIP_TUTORIAL_ACTION_LABEL,
    };
  }
  return {
    title: RETURN_HOME_CONFIRM_TITLE,
    body: RETURN_HOME_CONFIRM_BODY,
    confirm: RETURN_HOME_ACTION_LABEL,
  };
}

export function TableLeaveConfirm({
  intent,
  onStay,
  onConfirm,
}: TableLeaveConfirmProps): ReactElement | null {
  if (intent === null) {
    return null;
  }

  const chrome = confirmChrome(intent);

  return (
    <Dialog
      open
      title={chrome.title}
      onClose={onStay}
      actions={
        <>
          <Button compact variant="green" onClick={onStay}>
            {STAY_LABEL}
          </Button>
          <Button compact variant="red" onClick={onConfirm}>
            {chrome.confirm}
          </Button>
        </>
      }
    >
      {chrome.body !== null ? (
        <p className="text-sm text-ink">{chrome.body}</p>
      ) : (
        <p className="sr-only">{chrome.title}</p>
      )}
    </Dialog>
  );
}
