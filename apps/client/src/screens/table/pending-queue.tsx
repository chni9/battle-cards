/**
 * Pending effects strip — L12-01 placement; L12-04 restyles.
 */

import type { PendingEffectView, PlayingStateView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { nicknameOf } from './table-helpers';

export interface PendingQueueProps {
  view: PlayingStateView;
  effects: readonly PendingEffectView[];
}

export function PendingQueue({ view, effects }: PendingQueueProps): ReactElement {
  return (
    <section data-zone="pending-queue" className="text-cta-label-on-dark">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-soft">
        Pending effects
      </h2>
      {effects.length === 0 ? (
        <p className="mt-1 text-sm text-slate-soft">None</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-2">
          {effects.map((effect) => (
            <li
              key={effect.id}
              data-pending-id={effect.id}
              className="rounded-[length:var(--radius-badge)] border border-slate-soft/40 bg-surface-raised/95 px-2 py-1 text-xs text-ink"
            >
              <span className="font-semibold">{effect.cardId}</span>
              {' from '}
              {nicknameOf(view, effect.sourcePlayerId)}
              {' → '}
              {nicknameOf(view, effect.targetPlayerId)}
              <span className="text-ink-muted"> (#{effect.queuedAt})</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
