import {
  getKit,
  type KitId,
  type ReanimationKitChoiceRequiredPayload,
  type ResolveSubChoicePayload,
} from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../design/components/button';
import { KitPortrait } from '../../../design/components/kit-portrait';

export interface ReanimationKitPanelProps {
  subChoice: ReanimationKitChoiceRequiredPayload;
  onResolve: (payload: Extract<ResolveSubChoicePayload, { kind: 'reanimation-kit' }>) => void;
}

export function ReanimationKitPanel({
  subChoice,
  onResolve,
}: ReanimationKitPanelProps): ReactElement {
  const [selectedKitId, setSelectedKitId] = useState<KitId | ''>('');

  const resolvedKitId =
    selectedKitId !== '' && subChoice.eligibleKitIds.includes(selectedKitId)
      ? selectedKitId
      : (subChoice.eligibleKitIds[0] ?? '');

  const ready = resolvedKitId !== '';

  return (
    <>
      <p className="text-sm text-ink-muted">Choose which kit to revive with.</p>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {subChoice.eligibleKitIds.map((kitId) => {
          const selected = resolvedKitId === kitId;
          const kit = getKit(kitId);

          return (
            <li key={kitId}>
              <button
                type="button"
                aria-pressed={selected}
                aria-label={kit.name}
                onClick={() => {
                  setSelectedKitId(kitId);
                }}
                className={[
                  'flex h-full w-full flex-col items-center rounded-[length:var(--radius-card)] border p-1.5 text-left transition',
                  selected
                    ? 'border-cta-orange bg-surface ring-2 ring-cta-orange/40'
                    : 'border-border-soft bg-surface hover:border-border',
                ].join(' ')}
              >
                <KitPortrait kitId={kitId} className="w-full max-w-[5.5rem]" />
                <span className="mt-1 w-full truncate text-center text-xs font-semibold text-ink">
                  {kit.name}
                </span>
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
            onResolve({ kind: 'reanimation-kit', kitId: resolvedKitId });
          }}
        >
          Confirm kit
        </Button>
      </div>
    </>
  );
}
