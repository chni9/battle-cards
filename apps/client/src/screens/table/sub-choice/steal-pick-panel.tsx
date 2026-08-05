import {
  formatCardLabel,
  getCard,
  type CardInstance,
  type PlayingStateView,
  type PublicPlayerView,
  type ResolveSubChoicePayload,
  type StealPickChoiceRequiredPayload,
} from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../design/components/button';
import { Card } from '../../../design/components/card';
import { nicknameOf } from '../table-helpers';

export interface StealPickPanelProps {
  subChoice: StealPickChoiceRequiredPayload;
  view: PlayingStateView;
  opponents: readonly PublicPlayerView[];
  onResolve: (payload: Extract<ResolveSubChoicePayload, { kind: 'steal-pick' }>) => void;
}

function resolveEligibleCards(
  subChoice: StealPickChoiceRequiredPayload,
  opponents: readonly PublicPlayerView[],
): readonly { instanceId: string; instance: CardInstance | null }[] {
  const victim = opponents.find((player) => player.id === subChoice.victimPlayerId);
  const spiedCards =
    victim?.spied !== undefined
      ? [...victim.spied.hand, ...victim.spied.specialCards]
      : [];

  return subChoice.eligibleInstanceIds.map((instanceId) => {
    const instance = spiedCards.find((card) => card.instanceId === instanceId) ?? null;
    return { instanceId, instance };
  });
}

export function StealPickPanel({
  subChoice,
  view,
  opponents,
  onResolve,
}: StealPickPanelProps): ReactElement {
  const [selectedId, setSelectedId] = useState('');

  const entries = resolveEligibleCards(subChoice, opponents);
  const resolvedSelectedId =
    selectedId !== '' && subChoice.eligibleInstanceIds.includes(selectedId)
      ? selectedId
      : (subChoice.eligibleInstanceIds[0] ?? '');

  const ready = resolvedSelectedId !== '';

  return (
    <>
      <p className="text-sm text-ink-muted">
        Choose a card to steal from {nicknameOf(view, subChoice.victimPlayerId)}.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {entries.map(({ instanceId, instance }) => {
          const selected = resolvedSelectedId === instanceId;

          if (instance === null) {
            const truncated =
              instanceId.length > 8 ? `${instanceId.slice(0, 8)}…` : instanceId;
            return (
              <li key={instanceId}>
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Unknown card ${truncated}`}
                  onClick={() => {
                    setSelectedId(instanceId);
                  }}
                  className={[
                    'flex h-full w-full flex-col items-center rounded-[length:var(--radius-card)] border p-1.5 text-left transition',
                    selected
                      ? 'border-cta-orange bg-surface ring-2 ring-cta-orange/40'
                      : 'border-border-soft bg-surface hover:border-border',
                  ].join(' ')}
                >
                  <span className="flex aspect-[3/4] w-full max-w-[5.5rem] items-center justify-center rounded-[length:var(--radius-card)] border border-dashed border-border bg-surface-raised text-[10px] font-medium text-ink-muted">
                    {truncated}
                  </span>
                  <span className="mt-1 w-full truncate text-center text-xs font-semibold text-ink-muted">
                    Hidden card
                  </span>
                </button>
              </li>
            );
          }

          const definition = getCard(instance.cardId);
          const name = formatCardLabel(instance.cardId, instance.isUpgraded);

          return (
            <li key={instanceId}>
              <button
                type="button"
                aria-pressed={selected}
                aria-label={name}
                onClick={() => {
                  setSelectedId(instanceId);
                }}
                className={[
                  'flex h-full w-full flex-col items-center rounded-[length:var(--radius-card)] border p-1.5 text-left transition',
                  selected
                    ? 'border-cta-orange bg-surface ring-2 ring-cta-orange/40'
                    : 'border-border-soft bg-surface hover:border-border',
                ].join(' ')}
              >
                <Card
                  instance={instance}
                  detail="thumb"
                  className="pointer-events-none w-full max-w-[5.5rem]"
                />
                <span className="mt-1 w-full truncate text-center text-xs font-semibold text-ink">
                  {name}
                </span>
                {definition !== undefined && (
                  <span className="mt-0.5 text-center text-[11px] font-medium text-ink-muted">
                    {definition.type}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex justify-end">
        <Button
          variant="green"
          disabled={!ready}
          onClick={() => {
            if (!ready) {
              return;
            }
            onResolve({ kind: 'steal-pick', instanceId: resolvedSelectedId });
          }}
        >
          Confirm steal
        </Button>
      </div>
    </>
  );
}
