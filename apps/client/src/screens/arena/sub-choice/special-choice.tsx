/**
 * The special card picker — technical spec v7 §6.7; V2 `special-pick-panel.tsx` (L44-05);
 * Appendix A `table-subchoice-special-pick` (L74-19).
 *
 * - The server's `eligibleCardIds`, in order, by catalog name with no upgrade tag (V2). The client
 *   never filters the list: Card Transformer is the server's to leave out (golden rule 8).
 * - The first special is preselected, and a pick a resend no longer offers falls back to it.
 */

import { getCard, type SpecialCardId, type SpecialPickChoiceRequiredPayload } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../ui/primitives/button';
import { DISABLED_REASON_COPY } from '../../../view-model/action-reasons';
import { ChoiceCardTile } from './choice-card-tile';
import { resolvePick, type SubChoicePickerProps } from './sub-choice-model';

export function SpecialChoice({
  subChoice,
  frame,
  send,
  locked,
}: SubChoicePickerProps<SpecialPickChoiceRequiredPayload>): ReactElement {
  const [picked, setPicked] = useState<SpecialCardId | null>(null);
  const pick = resolvePick(picked, subChoice.eligibleCardIds);

  const body = (
    <>
      <p className="text-v7-body text-v7-text-2">Choose which special card to receive.</p>
      <ul className="mt-3 flex flex-wrap gap-3">
        {subChoice.eligibleCardIds.map((cardId) => (
          <li key={cardId} className="min-w-0">
            <ChoiceCardTile
              instance={{ instanceId: `pick-${cardId}`, cardId, isUpgraded: false }}
              label={getCard(cardId)?.name ?? cardId}
              selected={pick === cardId}
              onSelect={() => {
                setPicked(cardId);
              }}
            />
          </li>
        ))}
      </ul>
    </>
  );

  const actions = (
    <Button
      variant="primary"
      disabled={pick === null || locked}
      {...(locked ? { disabledReason: DISABLED_REASON_COPY['actions-locked'] } : {})}
      onClick={() => {
        if (pick !== null) send({ kind: 'special-pick', cardId: pick });
      }}
    >
      Confirm special
    </Button>
  );

  return frame({ body, actions });
}
