/**
 * Active slot drop — Lot 69.
 */

import {
  formatCardLabel,
  type ResolveSubChoicePayload,
  type SlotDropChoiceRequiredPayload,
} from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Button } from '../../../design/components/button';

export interface SlotDropPanelProps {
  subChoice: SlotDropChoiceRequiredPayload;
  onResolve: (payload: Extract<ResolveSubChoicePayload, { kind: 'slot-drop' }>) => void;
}

export function SlotDropPanel({ subChoice, onResolve }: SlotDropPanelProps): ReactElement {
  return (
    <>
      <p className="text-sm text-ink-muted">
        You have four active cards. Pick one to remove so the new card can stay.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {subChoice.eligibleSlots.map((slot) => (
          <li key={slot.id}>
            <Button
              variant="purple"
              className="w-full justify-start"
              onClick={() => {
                onResolve({ kind: 'slot-drop', slotId: slot.id });
              }}
            >
              {formatCardLabel(slot.cardId, slot.isUpgraded)}
              {slot.kind === 'shield' ? ' (shield)' : ''}
              {slot.kind === 'sentence' ? ' (sentence)' : ''}
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
