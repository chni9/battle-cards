/**
 * Kit sheet — technical spec v7 §6.6.5 (a kit portrait opens its sheet with every current
 * section), Q46, §6.7 (read-only sheets stack); Lot 74 plan Appendix A.5. `KitDetails` shows one
 * section per `KitTraits` field (L30-05). Opening or closing it sends nothing (§6.6.4).
 */

import { getKit, type KitId } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { KitDetails } from '../../ui/kit/kit-details';
import { Sheet } from '../../ui/primitives/sheet';
import { arenaSheetKey } from './arena-sheets';

export interface KitSheetProps {
  /** False while the sheet plays its exit from `closing` (arena-sheets.ts). */
  open: boolean;
  kitId: KitId;
  onClose: () => void;
}

export function KitSheet({ open, kitId, onClose }: KitSheetProps): ReactElement {
  return (
    <Sheet
      open={open}
      mode="read-only"
      placement="bottom"
      title={getKit(kitId).name}
      onClose={onClose}
      dataAttributes={{ 'data-arena-sheet': arenaSheetKey({ kind: 'kit', kitId }) }}
    >
      <KitDetails kitId={kitId} />
    </Sheet>
  );
}
