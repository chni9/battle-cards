/**
 * Unspy seat picker — L58-07 / Lot 44 SeatTile.
 * Client greys from public `spyingOnYou` + points; server revalidates.
 */

import type { PlayingStateView, PublicPlayerView } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { Dialog } from '../../design/components/dialog';
import { SeatTile } from '../../design/components/seat-tile';
import { UNSPY_ACTION_LABEL } from './chrome-labels';
import { visibleKitId } from './table-helpers';

export interface UnspyDialogProps {
  open: boolean;
  view: PlayingStateView;
  spies: readonly PublicPlayerView[];
  onClose: () => void;
  onConfirm: (targetPlayerId: string) => void;
}

export function UnspyDialog({
  open,
  view,
  spies,
  onClose,
  onConfirm,
}: UnspyDialogProps): ReactElement {
  const [targetId, setTargetId] = useState('');
  const resolvedTarget = spies.some((player) => player.id === targetId) ? targetId : '';

  return (
    <Dialog
      open={open}
      title={UNSPY_ACTION_LABEL}
      onClose={() => {
        setTargetId('');
        onClose();
      }}
      actions={
        <>
          <Button
            compact
            variant="purple"
            disabled={resolvedTarget === ''}
            onClick={() => {
              if (resolvedTarget === '') {
                return;
              }
              onConfirm(resolvedTarget);
              setTargetId('');
            }}
          >
            Confirm
          </Button>
          <Button
            compact
            variant="red"
            onClick={() => {
              setTargetId('');
              onClose();
            }}
          >
            Cancel
          </Button>
        </>
      }
    >
      <ul className="grid grid-cols-2 gap-3 p-2 sm:grid-cols-3" data-unspy-picker="">
        {spies.map((player) => (
          <li key={player.id}>
            <SeatTile
              view={view}
              playerId={player.id}
              nickname={player.nickname}
              kitId={visibleKitId(player)}
              selected={resolvedTarget === player.id}
              onSelect={() => {
                setTargetId(player.id);
              }}
            />
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
