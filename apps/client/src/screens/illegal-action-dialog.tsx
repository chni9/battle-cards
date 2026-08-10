/**
 * In-game modal for illegal / rejected actions — L39-02.
 * Esc / backdrop / OK dismiss. Lobby keeps the inline alert instead.
 */

import type { ActionRejectCode } from '@card-battle/shared';
import { useCallback, type ReactElement } from 'react';

import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';
import { resolveIllegalActionCopy } from './illegal-action-copy';

export interface IllegalActionReject {
  code: ActionRejectCode;
  message: string;
}

export interface IllegalActionDialogProps {
  reject: IllegalActionReject | null;
  onClose: () => void;
}

export function IllegalActionDialog({
  reject,
  onClose,
}: IllegalActionDialogProps): ReactElement | null {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Unmount when cleared — keeping Dialog mounted with open=false can leave a
  // stuck AnimatePresence overlay that blocks the table (L39-06 playtest).
  if (reject === null) {
    return null;
  }

  const copy = resolveIllegalActionCopy(reject.code, reject.message);

  return (
    <Dialog
      open
      title={copy.title}
      onClose={handleClose}
      closeOnOverlayClick
      actions={
        <Button type="button" variant="green" onClick={handleClose}>
          OK
        </Button>
      }
    >
      <p>{copy.body}</p>
    </Dialog>
  );
}
