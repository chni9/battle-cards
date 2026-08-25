/**
 * Steal pick — L44-05 / technical spec v6 §6.4.
 * Hidden identities use the attack verso; instance ids stay off the tile.
 */

import {
  formatCardLabel,
  type CardInstance,
  type PlayingStateView,
  type PublicPlayerView,
  type ResolveSubChoicePayload,
  type StealPickChoiceRequiredPayload,
} from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../design/components/button';
import {
  CardChoiceTile,
  HIDDEN_CARD_CAPTION,
} from '../../../design/components/card-choice-tile';
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
          const name =
            instance === null
              ? HIDDEN_CARD_CAPTION
              : formatCardLabel(instance.cardId, instance.isUpgraded);

          return (
            <li key={instanceId}>
              <CardChoiceTile
                instance={instance}
                caption={name}
                selected={selected}
                ariaLabel={name}
                onSelect={() => {
                  setSelectedId(instanceId);
                }}
              />
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
