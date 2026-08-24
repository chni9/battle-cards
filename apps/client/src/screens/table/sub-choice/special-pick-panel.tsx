/**
 * Special pick — L44-05 / technical spec v6 §6.4.
 */

import {
  getCard,
  type SpecialCardId,
  type ResolveSubChoicePayload,
  type SpecialPickChoiceRequiredPayload,
} from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../design/components/button';
import { CardChoiceTile } from '../../../design/components/card-choice-tile';

export interface SpecialPickPanelProps {
  subChoice: SpecialPickChoiceRequiredPayload;
  onResolve: (payload: Extract<ResolveSubChoicePayload, { kind: 'special-pick' }>) => void;
}

export function SpecialPickPanel({ subChoice, onResolve }: SpecialPickPanelProps): ReactElement {
  const [selectedId, setSelectedId] = useState<SpecialCardId | ''>('');

  const resolvedSelectedId =
    selectedId !== '' && subChoice.eligibleCardIds.includes(selectedId)
      ? selectedId
      : (subChoice.eligibleCardIds[0] ?? '');

  const ready = resolvedSelectedId !== '';

  return (
    <>
      <p className="text-sm text-ink-muted">Choose which special card to receive.</p>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {subChoice.eligibleCardIds.map((cardId) => {
          const selected = resolvedSelectedId === cardId;
          const definition = getCard(cardId);
          const name = definition?.name ?? cardId;
          const shopInstance = {
            instanceId: `pick-${cardId}`,
            cardId,
            isUpgraded: false,
          } as const;

          return (
            <li key={cardId}>
              <CardChoiceTile
                instance={shopInstance}
                caption={name}
                selected={selected}
                ariaLabel={name}
                onSelect={() => {
                  setSelectedId(cardId);
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
            onResolve({ kind: 'special-pick', cardId: resolvedSelectedId });
          }}
        >
          Confirm special
        </Button>
      </div>
    </>
  );
}
