/**
 * The steal picker — technical spec v7 §6.7, §6.3, §13 Q54; V2 `steal-pick-panel.tsx` (L44-05);
 * Appendix A `table-subchoice-steal-pick` (L74-19).
 *
 * - A face shows only where the victim's Spy+ hand or specials reveal it. A base Spy sends no
 *   `spied.hand`, so every eligible card is the attack verso named and captioned 'Hidden card'
 *   and no instance id reaches the DOM (Q54: a base Spy steals blind).
 * - The first card is preselected (V2), and a pick a resend no longer offers falls back to it.
 */

import { formatCardLabel, type CardInstance, type PlayingStateView, type StealPickChoiceRequiredPayload } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { HIDDEN_CARD_LABEL } from '../../../ui/card/card-face';
import { Button } from '../../../ui/primitives/button';
import { DISABLED_REASON_COPY } from '../../../view-model/action-reasons';
import { nicknameOf } from '../../../view-model/table-helpers';
import { ChoiceCardTile } from './choice-card-tile';
import { resolvePick, type SubChoicePickerProps } from './sub-choice-model';

interface StealTile {
  readonly instanceId: string;
  /** Null where the victim's cards are not revealed to this seat (§6.3). */
  readonly instance: CardInstance | null;
}

/** One tile per eligible id in payload order (V2 `resolveEligibleCards`); never the unspied faces. */
function stealTiles(view: PlayingStateView, subChoice: StealPickChoiceRequiredPayload): readonly StealTile[] {
  const victim = view.players.find((player) => player.id === subChoice.victimPlayerId);
  const known = [...(victim?.spied?.hand ?? []), ...(victim?.spied?.specialCards ?? [])];
  return subChoice.eligibleInstanceIds.map((instanceId) => ({
    instanceId,
    instance: known.find((card) => card.instanceId === instanceId) ?? null,
  }));
}

export function StealChoice({
  subChoice,
  view,
  frame,
  send,
  locked,
}: SubChoicePickerProps<StealPickChoiceRequiredPayload>): ReactElement {
  const [picked, setPicked] = useState<string | null>(null);
  const pick = resolvePick(picked, subChoice.eligibleInstanceIds);

  const body = (
    <>
      <p className="text-v7-body text-v7-text-2">{`Choose a card to steal from ${nicknameOf(view, subChoice.victimPlayerId)}.`}</p>
      <ul className="mt-3 flex flex-wrap gap-3">
        {stealTiles(view, subChoice).map(({ instanceId, instance }) => (
          <li key={instanceId} className="min-w-0">
            <ChoiceCardTile
              instance={instance}
              label={instance === null ? HIDDEN_CARD_LABEL : formatCardLabel(instance.cardId, instance.isUpgraded)}
              {...(instance === null ? { caption: HIDDEN_CARD_LABEL } : {})}
              selected={pick === instanceId}
              onSelect={() => {
                setPicked(instanceId);
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
        if (pick !== null) send({ kind: 'steal-pick', instanceId: pick });
      }}
    >
      Confirm steal
    </Button>
  );

  return frame({ body, actions });
}
