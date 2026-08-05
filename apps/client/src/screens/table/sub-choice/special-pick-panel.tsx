import {
  getCard,
  type ResolveSubChoicePayload,
  type SpecialCardId,
  type SpecialPickChoiceRequiredPayload,
} from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../design/components/button';
import { Card } from '../../../design/components/card';

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
              <button
                type="button"
                aria-pressed={selected}
                aria-label={name}
                onClick={() => {
                  setSelectedId(cardId);
                }}
                className={[
                  'flex h-full w-full flex-col items-center rounded-[length:var(--radius-card)] border p-1.5 text-left transition',
                  selected
                    ? 'border-cta-orange bg-surface ring-2 ring-cta-orange/40'
                    : 'border-border-soft bg-surface hover:border-border',
                ].join(' ')}
              >
                <Card
                  instance={shopInstance}
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
            onResolve({ kind: 'special-pick', cardId: resolvedSelectedId });
          }}
        >
          Confirm special
        </Button>
      </div>
    </>
  );
}
