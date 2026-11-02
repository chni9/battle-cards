/**
 * The pool recovery picker — technical spec v7 §6.7, §13 Q55; V2 `pool-pick-panel.tsx` (L44-05);
 * Appendix A `table-subchoice-pool-pick`; Lot 74 Part 2 Review Focus 2 (L74-19).
 *
 * - The eligible pool cards in `view.pool` order, nothing preselected. A tap toggles; the
 *   unselected tiles grey at `maxCount` (V2 `atCap`) and Confirm needs exactly `maxCount`. The ids
 *   go out in tap order, as V2 sent them.
 * - `picked` is pruned to the offered ids in the render phase, never in an effect. A pick a resend
 *   no longer offers leaves for good, so a later resend that offers the card again cannot revive
 *   it and push the count past `maxCount` (it would read 3/2 and disable Confirm).
 */

import { formatCardLabel, type PoolPickChoiceRequiredPayload } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../ui/primitives/button';
import { DISABLED_REASON_COPY } from '../../../view-model/action-reasons';
import { ChoiceCardTile } from './choice-card-tile';
import type { SubChoicePickerProps } from './sub-choice-model';

export function PoolChoice({
  subChoice,
  view,
  frame,
  send,
  locked,
}: SubChoicePickerProps<PoolPickChoiceRequiredPayload>): ReactElement {
  const cards = view.pool.filter((card) => subChoice.eligibleInstanceIds.includes(card.instanceId));
  const [picked, setPicked] = useState<readonly string[]>([]);
  const selected = picked.filter((id) => subChoice.eligibleInstanceIds.includes(id));
  if (selected.length !== picked.length) setPicked(selected);
  const atCap = selected.length >= subChoice.maxCount;
  const count = String(subChoice.maxCount);

  const toggle = (instanceId: string): void => {
    if (selected.includes(instanceId)) {
      setPicked(selected.filter((id) => id !== instanceId));
    } else if (!atCap) {
      setPicked([...selected, instanceId]);
    }
  };

  const body = (
    <>
      <p className="text-v7-body text-v7-text-2">
        {`Select exactly ${count} card${subChoice.maxCount === 1 ? '' : 's'} from the shared pool (${String(selected.length)}/${count} selected).`}
      </p>
      {cards.length === 0 ? (
        <p className="mt-3 text-v7-body text-v7-text-2">No eligible cards in the pool.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-3">
          {cards.map((card) => {
            const isSelected = selected.includes(card.instanceId);
            return (
              <li key={card.instanceId} className="min-w-0">
                <ChoiceCardTile
                  instance={card}
                  label={formatCardLabel(card.cardId, card.isUpgraded)}
                  selected={isSelected}
                  disabled={!isSelected && atCap}
                  onSelect={() => {
                    toggle(card.instanceId);
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  const actions = (
    <Button
      variant="primary"
      disabled={selected.length !== subChoice.maxCount || locked}
      {...(locked ? { disabledReason: DISABLED_REASON_COPY['actions-locked'] } : {})}
      onClick={() => {
        if (selected.length === subChoice.maxCount) send({ kind: 'pool-pick', instanceIds: selected });
      }}
    >
      Confirm recovery
    </Button>
  );

  return frame({ body, actions });
}
