/**
 * The elimination reward picker — rules spec §6; technical spec v7 §6.7, §13 Q55; V2
 * `reward-panel.tsx` (L44-06); Appendix A `table-subchoice-reward` (L74-18).
 *
 * - Two `Segmented` radiogroups, 'Choice 1' (4 lives) and 'Choice 2' (8 points), a valid payload at
 *   once (V2). The kinds are V2's spoken labels as words (designer default 2026-11-02).
 * - 'A card' opens a tile grid of every card this prompt offered, first-seen order. A card the
 *   other choice holds, or one a refreshed prompt no longer offers, is greyed with the
 *   `ILLEGAL_ACTION_COPY` reward-card body as its reason, and Confirm stays disabled with that
 *   reason until both picks are valid (Q55, client-side only: the server still decides). Choice 2
 *   starts on the first card Choice 1 does not hold.
 * - No `reward` card sheet source (plan A.9.4, D2): a read-only sheet always paints under an
 *   expanded blocking sheet, so tiles show face and name, as V2 did.
 */

import { formatCardLabel, type CardInstance, type RewardChoiceRequiredPayload } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../ui/primitives/button';
import { Segmented } from '../../../ui/primitives/segmented';
import { DISABLED_REASON_COPY } from '../../../view-model/action-reasons';
import { nicknameOf, REWARD_KIND_LABELS, REWARD_KINDS, type RewardKind } from '../../../view-model/table-helpers';
import { ILLEGAL_ACTION_COPY } from '../../illegal-action-copy';
import { ChoiceCardTile } from './choice-card-tile';
import {
  DEFAULT_REWARD_PICKS,
  mergeSeenCards,
  pickRewardCard,
  pickRewardKind,
  rewardCardBlock,
  rewardConfirm,
  type RewardPicks,
  type RewardSlot,
} from './reward-model';
import type { SubChoicePickerProps } from './sub-choice-model';

const REWARD_SLOTS = [0, 1] as const satisfies readonly RewardSlot[];

export function RewardChoice({
  subChoice,
  view,
  frame,
  send,
  locked,
}: SubChoicePickerProps<RewardChoiceRequiredPayload>): ReactElement {
  const offered = subChoice.availableCards;
  const [picks, setPicks] = useState<RewardPicks>(DEFAULT_REWARD_PICKS);
  // Every card this prompt offered, so a card a resend drops stays visible, greyed (Q55).
  // Render-phase, never an effect.
  const [seen, setSeen] = useState<readonly CardInstance[]>(offered);
  const cards = mergeSeenCards(seen, offered);
  if (cards !== seen) setSeen(cards);
  const confirm = rewardConfirm(subChoice, picks);
  const confirmReason = locked
    ? DISABLED_REASON_COPY['actions-locked']
    : confirm.block !== null
      ? ILLEGAL_ACTION_COPY[confirm.block].body
      : undefined;

  const body = (
    <>
      <p className="text-v7-body text-v7-text-2">Pick two rewards from {nicknameOf(view, subChoice.eliminatedPlayerId)}.</p>
      {REWARD_SLOTS.map((slot) => {
        const label = `Choice ${String(slot + 1)}`;
        const pick = picks[slot];
        return (
          <fieldset key={label} className="mt-3 min-w-0">
            <legend className="font-v7-display text-v7-body text-v7-text">{label}</legend>
            <div className="mt-1.5">
              <Segmented<RewardKind>
                label={label}
                options={REWARD_KINDS.map((kind) => ({
                  value: kind,
                  label: REWARD_KIND_LABELS[kind],
                  disabled: kind === 'card' && offered.length === 0,
                }))}
                value={pick.kind}
                onChange={(kind) => {
                  setPicks((current) => pickRewardKind(current, slot, kind, offered));
                }}
              />
            </div>
            {pick.kind === 'card' ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {cards.map((card) => {
                  const block = rewardCardBlock(card.instanceId, slot, picks, offered);
                  return (
                    <li key={card.instanceId} className="min-w-0">
                      <ChoiceCardTile
                        instance={card}
                        label={formatCardLabel(card.cardId, card.isUpgraded)}
                        selected={pick.cardId === card.instanceId}
                        {...(block !== null ? { disabled: true, description: ILLEGAL_ACTION_COPY[block].body } : {})}
                        onSelect={() => {
                          setPicks((current) => pickRewardCard(current, slot, card.instanceId));
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </fieldset>
        );
      })}
    </>
  );

  const actions = (
    <Button
      variant="primary"
      disabled={confirm.payload === null || locked}
      {...(confirmReason !== undefined ? { disabledReason: confirmReason } : {})}
      onClick={() => {
        if (confirm.payload !== null) send(confirm.payload);
      }}
    >
      Confirm rewards
    </Button>
  );

  return frame({ body, actions });
}
