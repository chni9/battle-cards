/**
 * The slot-drop picker — technical spec v7 §6.7, §13 Q42 / Q56, §14.3; Appendix A
 * `table-subchoice-slot-drop`, `table-slot-drop-commit-cancel`; V2 `slot-drop-panel.tsx` (Lot 69);
 * server `engine/specials/slot-drop.ts` `cancelSlotDrop` (L74-20).
 *
 * - **Select, then Drop.** V2 dropped the tapped slot at once. A drop removes a card for good, so a
 *   tap only selects (`aria-pressed`), nothing is preselected, and 'Drop' sends the selected
 *   `slotId`. The server never lists Curse (Lot 69); the list renders as sent.
 * - **Cancel is explicit.** It sends `cancel: true` and is never wired to Esc or the backdrop (the
 *   host is a blocking sheet with no `onClose`). A line under the tiles, which also describes the
 *   button, states its outcome as the server's `cancelSlotDrop` produces it: the pending activation
 *   is discarded, a played special goes back to its holder, the holder keeps four active cards, and
 *   the same seat's turn restarts unspent. It says nothing about points, so it reads true whether or
 *   not Cancel refunds them (decisions.md, L74-20).
 * - **A pick the prompt no longer offers is dropped in the render phase**, never in an effect, so a
 *   later resend that offers the slot again cannot revive it and enable Drop on a card the player
 *   never re-picked (the pool picker's guard, L74-19).
 * - Drop and Cancel honour the host's `locked` ('Actions locked'); a tile tap still selects.
 */

import { formatCardLabel, type SlotDropChoiceRequiredPayload } from '@card-battle/shared';
import { useId, useState, type ReactElement } from 'react';

import { Button } from '../../../ui/primitives/button';
import { DISABLED_REASON_COPY } from '../../../view-model/action-reasons';
import { nicknameOf } from '../../../view-model/table-helpers';
import { CANCEL_ACTION_LABEL } from '../card-sheet-actions';
import { ChoiceCardTile } from './choice-card-tile';
import type { SubChoicePickerProps } from './sub-choice-model';

type EligibleSlot = SlotDropChoiceRequiredPayload['eligibleSlots'][number];

/** V2 `slot-drop-panel.tsx` caption, verbatim: the card label, plus the slot kind for Shield and Sentence. */
function slotCaption(slot: EligibleSlot): string {
  const label = formatCardLabel(slot.cardId, slot.isUpgraded);
  if (slot.kind === 'shield') return `${label} (shield)`;
  if (slot.kind === 'sentence') return `${label} (sentence)`;
  return label;
}

/** Spec v7 §10.6 (new strings): what Cancel does to your own prompt, as `cancelSlotDrop` leaves it. */
const OWN_CANCEL_OUTCOME =
  'Cancel: the new card is not activated and stays in your hand or goes back to your specials. You keep your four active cards and can still act this turn.';

/** Spec v7 §10.6 (new strings): what Cancel does to the Curse caster's prompt. */
function curseCancelOutcome(victim: string): string {
  return `Cancel: your Curse is not cast and goes back to your specials. ${victim} keeps their four active cards, and you can still act this turn.`;
}

export function SlotDropChoice({
  subChoice,
  view,
  frame,
  send,
  locked,
}: SubChoicePickerProps<SlotDropChoiceRequiredPayload>): ReactElement {
  const [picked, setPicked] = useState<string | null>(null);
  const offered = picked !== null && subChoice.eligibleSlots.some((slot) => slot.id === picked);
  if (picked !== null && !offered) setPicked(null);
  const slotId = offered ? picked : null;
  const own = subChoice.slotOwnerPlayerId === view.you;
  const victim = nicknameOf(view, subChoice.slotOwnerPlayerId);
  const outcomeId = useId();
  const lockReason = locked ? { disabledReason: DISABLED_REASON_COPY['actions-locked'] } : {};

  const body = (
    <>
      <p className="text-v7-body text-v7-text-2">
        {own
          ? 'You have four active cards. Pick one to remove so the new card can stay.'
          : `${victim} has four active cards. Pick one of theirs to remove so your Curse can land.`}
      </p>
      <ul className="mt-3 flex flex-wrap gap-3">
        {subChoice.eligibleSlots.map((slot) => {
          const caption = slotCaption(slot);
          return (
            <li key={slot.id} className="min-w-0">
              <ChoiceCardTile
                instance={{ instanceId: slot.id, cardId: slot.cardId, isUpgraded: slot.isUpgraded }}
                label={caption}
                {...(slot.kind === 'persistent' ? {} : { caption })}
                selected={slot.id === slotId}
                onSelect={() => {
                  setPicked(slot.id);
                }}
              />
            </li>
          );
        })}
      </ul>
      <p id={outcomeId} data-slot-drop-cancel="" className="mt-3 text-v7-caption text-v7-text-2">
        {own ? OWN_CANCEL_OUTCOME : curseCancelOutcome(victim)}
      </p>
    </>
  );

  // Cancel first, so Drop sits rightmost. Both share the host's one-answer latch.
  const actions = (
    <>
      <Button
        variant="secondary"
        aria-describedby={outcomeId}
        disabled={locked}
        {...lockReason}
        onClick={() => {
          send({ kind: 'slot-drop', cancel: true });
        }}
      >
        {CANCEL_ACTION_LABEL}
      </Button>
      <Button
        variant="primary"
        disabled={slotId === null || locked}
        {...lockReason}
        onClick={() => {
          if (slotId !== null) send({ kind: 'slot-drop', slotId });
        }}
      >
        Drop
      </Button>
    </>
  );

  return frame({ body, actions });
}
