/**
 * The host's Kick confirm (technical spec v7 §7.2 'Kick (confirm)'; L57-09). A V7 Dialog titled
 * 'Kick this player?' with Cancel (quiet, first, so it takes the initial focus) and Kick
 * (danger). Esc, the backdrop and a swipe mean Cancel. Kick sends once per open: the per-open
 * epoch latch of `screens/arena/top-bar.tsx`, re-implemented here (plan A.9 ruling 5). The owner
 * passes `target: null` when the seat leaves `view.players` (plan Review Focus 4). L76-12.
 */

import { useRef, useState, type ReactElement } from 'react';

import { Button } from '../../ui/primitives/button';
import { Dialog } from '../../ui/primitives/dialog';
import { KICK_CANCEL_LABEL, KICK_LABEL, KICK_TITLE, kickConfirmBody } from './lobby-copy';

export interface KickConfirmDialogProps {
  readonly target: { readonly id: string; readonly nickname: string } | null;
  readonly onCancel: () => void;
  readonly onConfirm: (playerId: string) => void;
}

export function KickConfirmDialog({ target, onCancel, onConfirm }: KickConfirmDialogProps): ReactElement | null {
  const targetId = target?.id ?? null;
  const [openedId, setOpenedId] = useState<string | null>(targetId);
  const [epoch, setEpoch] = useState(targetId === null ? 0 : 1);
  // Each new target is a new open (adjust state while rendering, as screens/arena/top-bar.tsx does).
  if (targetId !== openedId) {
    setOpenedId(targetId);
    if (targetId !== null) setEpoch(epoch + 1);
  }
  // One Kick per open. While the Dialog exits, AnimatePresence keeps its stale handler, which still
  // holds the target; the ref is read at call time (decisions.md 2026-10-28).
  const sentEpoch = useRef<number | null>(null);
  const confirm = (): void => {
    if (target === null || sentEpoch.current === epoch) return;
    sentEpoch.current = epoch;
    onConfirm(target.id);
  };

  return (
    <Dialog
      open={target !== null}
      title={KICK_TITLE}
      onClose={onCancel}
      dataAttributes={{ 'data-lobby-sheet': 'kick-confirm' }}
      actions={
        <>
          <Button variant="quiet" onClick={onCancel}>
            {KICK_CANCEL_LABEL}
          </Button>
          <Button variant="danger" onClick={confirm}>
            {KICK_LABEL}
          </Button>
        </>
      }
    >
      {target !== null ? <p className="font-v7-body text-v7-body text-v7-text">{kickConfirmBody(target.nickname)}</p> : null}
    </Dialog>
  );
}
