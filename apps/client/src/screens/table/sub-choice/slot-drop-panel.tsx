/**
 * Active slot drop — Lot 69.
 */

import {
  formatCardLabel,
  type CardInstance,
  type ResolveSubChoicePayload,
  type SlotDropChoiceRequiredPayload,
} from '@card-battle/shared';
import type { ReactElement } from 'react';

import { CardChoiceTile } from '../../../design/components/card-choice-tile';

export interface SlotDropPanelProps {
  subChoice: SlotDropChoiceRequiredPayload;
  onResolve: (payload: Extract<ResolveSubChoicePayload, { kind: 'slot-drop' }>) => void;
}

function slotCaption(
  slot: SlotDropChoiceRequiredPayload['eligibleSlots'][number],
): string {
  const label = formatCardLabel(slot.cardId, slot.isUpgraded);

  if (slot.kind === 'shield') {
    return `${label} (shield)`;
  }

  if (slot.kind === 'sentence') {
    return `${label} (sentence)`;
  }

  return label;
}

function slotInstance(
  slot: SlotDropChoiceRequiredPayload['eligibleSlots'][number],
): CardInstance {
  return {
    instanceId: slot.id,
    cardId: slot.cardId,
    isUpgraded: slot.isUpgraded,
  };
}

export function SlotDropPanel({ subChoice, onResolve }: SlotDropPanelProps): ReactElement {
  return (
    <>
      <p className="text-sm text-ink-muted">
        You have four active cards. Pick one to remove so the new card can stay.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {subChoice.eligibleSlots.map((slot) => {
          const caption = slotCaption(slot);
          const instance = slotInstance(slot);

          return (
            <li key={slot.id}>
              <CardChoiceTile
                instance={instance}
                caption={caption}
                selected={false}
                ariaLabel={`Drop ${caption}`}
                onSelect={() => {
                  onResolve({ kind: 'slot-drop', slotId: slot.id });
                }}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}
