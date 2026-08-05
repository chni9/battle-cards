import {
  formatCardLabel,
  getCard,
  type PlayingStateView,
  type PoolPickChoiceRequiredPayload,
  type ResolveSubChoicePayload,
} from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../design/components/button';
import { Card } from '../../../design/components/card';

export interface PoolPickPanelProps {
  subChoice: PoolPickChoiceRequiredPayload;
  view: PlayingStateView;
  onResolve: (payload: Extract<ResolveSubChoicePayload, { kind: 'pool-pick' }>) => void;
}

export function PoolPickPanel({
  subChoice,
  view,
  onResolve,
}: PoolPickPanelProps): ReactElement {
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);

  const eligiblePool = view.pool.filter((instance) =>
    subChoice.eligibleInstanceIds.includes(instance.instanceId),
  );

  const toggle = (instanceId: string): void => {
    if (selectedIds.includes(instanceId)) {
      setSelectedIds(selectedIds.filter((id) => id !== instanceId));
      return;
    }

    if (selectedIds.length >= subChoice.maxCount) {
      return;
    }

    setSelectedIds([...selectedIds, instanceId]);
  };

  const ready = selectedIds.length === subChoice.maxCount;

  return (
    <>
      <p className="text-sm text-ink-muted">
        Select exactly {String(subChoice.maxCount)} card
        {subChoice.maxCount === 1 ? '' : 's'} from the shared pool (
        {String(selectedIds.length)}/{String(subChoice.maxCount)} selected).
      </p>
      {eligiblePool.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No eligible cards in the pool.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {eligiblePool.map((instance) => {
            const selected = selectedIds.includes(instance.instanceId);
            const atCap = !selected && selectedIds.length >= subChoice.maxCount;
            const definition = getCard(instance.cardId);
            const name = formatCardLabel(instance.cardId, instance.isUpgraded);

            return (
              <li key={instance.instanceId}>
                <button
                  type="button"
                  disabled={atCap}
                  aria-pressed={selected}
                  aria-label={name}
                  onClick={() => {
                    toggle(instance.instanceId);
                  }}
                  className={[
                    'flex h-full w-full flex-col items-center rounded-[length:var(--radius-card)] border p-1.5 text-left transition',
                    selected
                      ? 'border-cta-orange bg-surface ring-2 ring-cta-orange/40'
                      : 'border-border-soft bg-surface hover:border-border',
                    atCap ? 'cursor-not-allowed opacity-55' : '',
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
      )}
      <div className="mt-4 flex justify-end">
        <Button
          variant="green"
          disabled={!ready}
          onClick={() => {
            if (!ready) {
              return;
            }
            onResolve({ kind: 'pool-pick', instanceIds: selectedIds });
          }}
        >
          Confirm recovery
        </Button>
      </div>
    </>
  );
}
