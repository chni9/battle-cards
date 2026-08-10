import {
  formatCardLabel,
  type CardInstance,
  type ResolveSubChoicePayload,
  type RewardChoiceRequiredPayload,
  type PlayingStateView,
} from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../design/components/button';
import { CostDisplay } from '../../../design/components/cost-display';
import {
  REWARD_KIND_COSTS,
  REWARD_KIND_LABELS,
  REWARD_KINDS,
  buildRewardChoice,
  nicknameOf,
  type RewardKind,
} from '../table-helpers';

export interface RewardPanelProps {
  subChoice: RewardChoiceRequiredPayload;
  view: PlayingStateView;
  onResolve: (payload: Extract<ResolveSubChoicePayload, { kind: 'elimination-reward' }>) => void;
}

export function RewardPanel({ subChoice, view, onResolve }: RewardPanelProps): ReactElement {
  const rewardIds = subChoice.availableCards.map((card) => card.instanceId);
  const firstReward = subChoice.availableCards[0]?.instanceId ?? '';

  const [rewardKind1, setRewardKind1] = useState<RewardKind>('lives');
  const [rewardKind2, setRewardKind2] = useState<RewardKind>('points');
  const [rewardCard1, setRewardCard1] = useState('');
  const [rewardCard2, setRewardCard2] = useState('');

  const resolvedRewardCard1 =
    rewardKind1 === 'card' && (rewardCard1 === '' || !rewardIds.includes(rewardCard1))
      ? firstReward
      : rewardCard1;
  const resolvedRewardCard2 =
    rewardKind2 === 'card' && (rewardCard2 === '' || !rewardIds.includes(rewardCard2))
      ? firstReward
      : rewardCard2;

  const choice1 = buildRewardChoice(rewardKind1, resolvedRewardCard1);
  const choice2 = buildRewardChoice(rewardKind2, resolvedRewardCard2);
  const ready = choice1 !== null && choice2 !== null;

  return (
    <>
      <p className="text-sm text-ink-muted">
        Pick two rewards from {nicknameOf(view, subChoice.eliminatedPlayerId)}.
      </p>
      <div className="mt-3 space-y-3">
        <RewardPick
          label="Choice 1"
          kind={rewardKind1}
          onKind={setRewardKind1}
          cardId={resolvedRewardCard1}
          onCard={setRewardCard1}
          cards={subChoice.availableCards}
        />
        <RewardPick
          label="Choice 2"
          kind={rewardKind2}
          onKind={setRewardKind2}
          cardId={resolvedRewardCard2}
          onCard={setRewardCard2}
          cards={subChoice.availableCards}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          variant="green"
          disabled={!ready}
          onClick={() => {
            if (choice1 === null || choice2 === null) {
              return;
            }
            onResolve({
              kind: 'elimination-reward',
              eliminationId: subChoice.eliminationId,
              choices: [choice1, choice2],
            });
          }}
        >
          Confirm rewards
        </Button>
      </div>
    </>
  );
}

function RewardPick({
  label,
  kind,
  onKind,
  cardId,
  onCard,
  cards,
}: {
  label: string;
  kind: RewardKind;
  onKind: (kind: RewardKind) => void;
  cardId: string;
  onCard: (id: string) => void;
  cards: readonly CardInstance[];
}): ReactElement {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="mt-1.5 flex flex-wrap gap-1.5"
      >
        {REWARD_KINDS.map((k) => {
          const selected = kind === k;
          const cost = REWARD_KIND_COSTS[k];
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={REWARD_KIND_LABELS[k]}
              onClick={() => {
                onKind(k);
              }}
              className={[
                'inline-flex min-h-9 items-center gap-1 rounded-[length:var(--radius-control)] border px-2.5 py-1 text-sm transition',
                selected
                  ? 'border-cta-green bg-surface ring-2 ring-cta-green/35 text-ink'
                  : 'border-border bg-surface text-ink hover:border-border',
              ].join(' ')}
            >
              {cost !== undefined ? (
                <CostDisplay cost={cost} />
              ) : (
                <span>{REWARD_KIND_LABELS[k]}</span>
              )}
            </button>
          );
        })}
      </div>
      {kind === 'card' && (
        <label className="mt-2 block text-sm text-ink">
          Card{' '}
          <select
            value={cardId}
            onChange={(event) => {
              onCard(event.target.value);
            }}
            className="rounded-[length:var(--radius-control)] border border-border bg-surface px-2 py-1 text-ink"
          >
            {cards.map((card) => (
              <option key={card.instanceId} value={card.instanceId}>
                {formatCardLabel(card.cardId, card.isUpgraded)}
              </option>
            ))}
          </select>
        </label>
      )}
    </fieldset>
  );
}
