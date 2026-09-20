/**
 * Pool pick — L44-05 / technical spec v6 §6.4.
 */

import {
  formatCardLabel,
  type PlayingStateView,
  type PoolPickChoiceRequiredPayload,
  type ResolveSubChoicePayload,
} from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../design/components/button';
import { CardChoiceTile } from '../../../design/components/card-choice-tile';

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
            const name = formatCardLabel(instance.cardId, instance.isUpgraded);

            return (
              <li key={instance.instanceId}>
                <CardChoiceTile
                  instance={instance}
                  caption={name}
                  selected={selected}
                  disabled={atCap}
                  ariaLabel={name}
                  onSelect={() => {
                    toggle(instance.instanceId);
                  }}
                />
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
