/**
 * Kit inspect Dialog — static roster facts from getKit / getCard (rules spec §4).
 * Trait sections are keyed off `KitTraits` so a new field fails the L30-05 test.
 */

import { getKit, type KitId } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { Dialog } from '../../design/components/dialog';
import { KitInspectDetails } from './kit-inspect-details';

export interface KitInspectDialogProps {
  open: boolean;
  kitId: KitId;
  onClose: () => void;
}

export function KitInspectDialog({
  open,
  kitId,
  onClose,
}: KitInspectDialogProps): ReactElement {
  const kit = getKit(kitId);

  return (
    <Dialog
      open={open}
      title={kit.name}
      onClose={onClose}
      panelClassName="max-w-lg"
      actions={
        <Button variant="green" onClick={onClose}>
          Close
        </Button>
      }
    >
      <KitInspectDetails kitId={kitId} />
    </Dialog>
  );
}
