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
  const [pickedId, setPickedId] = useState('');
  // One living spy is selected without a click — seat color already frames the
  // tile, so a disabled Confirm shrank into an unreadable blob (L58-09).
  const onlySpyId = spies.length === 1 ? spies[0]?.id : undefined;
  const resolvedTarget = spies.some((player) => player.id === pickedId)
    ? pickedId
    : (onlySpyId ?? '');

  return (
    <Dialog
      open={open}
      title={UNSPY_ACTION_LABEL}
      onClose={() => {
        setPickedId('');
        onClose();
      }}
      actions={
        <>
          <Button
            compact
            variant="purple"
            className="whitespace-nowrap"
            disabled={resolvedTarget === ''}
            onClick={() => {
              if (resolvedTarget === '') {
                return;
              }
              onConfirm(resolvedTarget);
              setPickedId('');
            }}
          >
            Confirm
          </Button>
          <Button
            compact
            variant="red"
            className="whitespace-nowrap"
            onClick={() => {
              setPickedId('');
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
                setPickedId(player.id);
              }}
            />
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
